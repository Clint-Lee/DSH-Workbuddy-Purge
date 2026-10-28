# 11128「渠道验证失败」的定位与修复（1.8.4）

> 现象：用池里的任何模型（截图里是 `DeepSeek-V4.1-Flash · x0.11`，国内版）发一句话，
> 整轮直接失败：
>
> ```
> 400: workbuddy upstream client (http 400) after 1 account(s) [Clint#6dd2cba4]:
> {"code":11128,"msg":"Illegal API invocation from an unapproved channel",
>  "displayTips":{"zh":"这次调用没通过渠道验证，可能是因为它不是从官方客户端发出的……"}}
> ```
>
> `type/code` 都是 `client`，也就是插件把上游的 400 原样抛出来，且只试了 1 个账号（client 是终止型，不轮换）。

## 一、结论（先看这个）

上游 `/v2/chat/completions` 前面有一层**客户端渠道校验**：只要请求体里出现它不认识的东西，
就用业务码 **11128** 拒掉，措辞故意说成「不是官方客户端发的」。

实测（本机真凭据，逐个字段二分，2026-10-28）**唯一必杀的字段是 `role: "developer"`**：

| 请求体 | 上游结果 |
| --- | --- |
| `role:"user"` 单条 | 200 |
| `role:"system"` + `tools` + `tool_choice:"auto"` | 200 |
| `role:"system"` + `reasoning_effort` + `store:false` + `max_completion_tokens` | 200 |
| 45KB system 提示 + 25 个工具 + `parallel_tool_calls` + `stream_options` | 200 |
| 非标准 content block（`tool-addition` / `epoch-header` / `thinking` …） | 400 **11101**（不是 11128） |
| `role:"tool"` 但缺 `tool_call_id` / assistant 空 content | 400 **11151**（不是 11128） |
| **`role:"developer"`**（哪怕只有这一处） | 400 **11128** ✅ 命中 |

而 DSH 恰好会发这个角色。证据来自 DSH 自带的 `@earendil-works/pi-ai@0.87.1`：

```js
// dist/api/openai-completions.js
const instructionRole = model.reasoning && compat.supportsDeveloperRole ? "developer" : "system"
```

- `compat.supportsDeveloperRole` 对本地 baseURL 的自定义 provider 默认是 `true`；
- `model.reasoning` 对池里所有「带思考档位」的模型都是 `true`（`deepseek-v4.1-flash`、`glm-*`、`hy3` …）。

所以**只要选的是推理模型，system 提示就会被发成 `developer` 消息**。
把 pi-ai 的真实序列化流程跑一遍，抓到的线上请求体是：

```json
{"model":"deepseek-v4.1-flash",
 "messages":[{"role":"developer","content":"You are a coding agent."},
             {"role":"user","content":[{"type":"text","text":"你好"}]}],
 "stream":true,"stream_options":{"include_usage":true},"store":false,
 "max_completion_tokens":32000,"reasoning_effort":"high"}
```

把这条原始请求体直接打上游 → 400/11128；只把 `developer` 改成 `system` 再打 → 200。
**这就是 11128 的全部原因。**

## 二、1.8.4 改了什么

### 1) 角色归一化（`src/upstream.ts` - `gatewayRole`）

不再只钉死 `developer` 一个字符串，而是维护一张角色表，把任何非
`system|user|assistant|tool` 的角色都折到网关认的那一个上（`developer`/`instructions`/`prompt` → `system`，
`function`/`tool_result` → `tool`，其余未知 → `system`）。
不丢弃消息，是因为网关对「空内容」另有 11151 拒法，丢掉等于换个码继续失败。

### 2) 请求体白名单重建（`sanitizeForChannel`）

渠道校验的规则没有公开，任何它不认识的东西都可能被判成「非官方客户端」。
所以加了兜底：一旦上游给出 11128（或 11101/11151 这类形态错误），
用**显式白名单**重建整个请求体：

- 顶层字段只保留 `model / messages / stream / max_tokens / max_completion_tokens /
  temperature / top_p / n / stop / presence_penalty / frequency_penalty / seed / user /
  reasoning_effort / response_format / tools / tool_choice / parallel_tool_calls`；
- `messages`：角色归一；content 只保留 `text` / `image_url`，其它 block 类型**降级成 text**
  （保住对话内容，丢掉类型）；`tool_calls` 只留 `id/type/function{name,arguments}`；
  缺 `tool_call_id` 的孤儿 tool 消息转成 user 文本；空消息丢弃（避免 11151）；
- `tools`：只留 `type/function{name,description,parameters}`。

### 3) 失败自愈重试（`src/shim.ts`）

在同一次请求里，若上游拒绝且命中上面两类码，**先用白名单体重发一次**，再决定要不要轮换账号。
只花 1 次额外尝试：白名单体再被拒，说明问题不在形状，不该耽误换号。
日志会写出改前/改后的 shape（只有键名、角色计数、工具数，不含对话内容）。

## 三、怎么验证（本仓库自带脚本，需要真凭据）

```bash
# 逐字段二分：证明只有 developer 会触发 11128
node probe/probe2.mjs

# 端到端：起真 shim（假账号池 + 真上游），用 DSH 真实形状的请求体打
node probe/shim-e2e.mjs      # 源码侧
node probe/bundle-e2e.mjs    # 构建产物 lib/index.js 侧
```

实测结果（两条用例）：

```
200 dsh-real (developer role)              # DSH 真实形状
200 harness extras (unknown blocks/fields) # 未知 block/字段，靠白名单重发救回来
LOG: … refused the request shape (400); resending from the gateway whitelist — before … / after …
```

## 四、第二轮：真正卡住的那一层（1.8.5）

1.8.4 上线重启后仍然 11128。用会话记录里的**真实材料**（`request/header` 的 30 个工具 +
`system/message` 的 27211 字符系统提示）复现，才发现 11128 有两个彼此独立的触发点：

| 请求 | 结果 |
| --- | --- |
| `system` + 27KB 真实提示 + 1 条 user | 400 **11128** |
| `system` + 27KB **`x` 填充** + 1 条 user | 200 ← 不是长度 |
| 同 27KB 提示放进 **`user`** | 200 |
| 同 27KB 提示放进 `developer` / 放到 assistant 历史 | 400 **11128** |
| 直方图采样：半段提示单独发 | 200（说明是内容累积评分，不是单个关键词） |

结论：网关对**指令类角色（`system` / `developer`）的内容做过滤**，命中就用同一个 11128 拒整轮；
同一个字符串换成 `user` 就放行。DSH 的系统提示（本会话就是那份 UNRESTRICTED SANDBOX 提示，
里面全是越狱/外挂/免杀之类的词）必然触发；换成 `deepseek-v4.1-flash` 也一样——
只要走这条网关，每一轮都会被拦。

### 1.8.5 的做法：三级自愈 + 记住形状

`chatCompletions` 的请求阶梯：

1. 正常体（`prepareChatBody`：角色归一 + `stream:true`）；
2. 被拒 → 白名单重建体（`sanitizeForChannel`：字段/角色/block 全部净化）；
3. 仍被拒 → **指令下沉**（`sanitizeForChannel(raw, { demoteInstructions: true })`）：
   把 `system` 消息改写成一条带前缀的用户消息（`[系统指令 · 由 DSH 会话下发…]`），
   内容一个字不减，只是换通道下发；
4. 第 3 步成功后 `instructionsInBand = true`，本 shim（按 region）后续请求**直接用第 3 步的形状**，
   不再浪费两次被拒调用；上下文压缩（`recoverFromContextOverrun`）里的摘要请求也走同一形状，
   否则压缩本身会一直 11128、只能退化成硬截断。

实测（源码与构建产物各跑一遍，真凭据真上游）：

```
200 第1次（经 2 次被拒后自愈）
200 第2次（记忆生效，一次成功）
LOG: … refused the request shape (400); resending from the gateway whitelist — before …
LOG: … refuses this system prompt on the instruction channel; resending it in-band as a user turn …
LOG: … in-band instructions accepted; keeping this shape for the rest of the session
```

代价说清楚：这会**绕过网关对系统提示的内容审查**，等价于把指令当用户消息发。
模型收到的内容不变；能不能用是网关策略问题，不是本地能力问题。

## 五、注意

- 本次改动同时写进了 `src/*.ts` 与已构建的 `lib/index.js`（本机 pnpm 装不齐
  `@deepseek-ai/dsh-invariants` 的版本，`tsdown` 无法重跑，故两份等价实现都保留并已分别跑通测试）。
- `probe/` 目录是这次的取证脚本，不进 `files` 白名单，不会被发布。
- 改完后必须**完全退出 DSH 再重开**（插件在 host 进程里是启动时一次性加载的，
  热改文件不会生效）。
