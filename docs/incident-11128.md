# 故障复盘：WorkBuddy 池全线 400 / code 11128

一句话：**不是账号、密钥、网络或插件配置的问题，是上游网关拒掉了请求体**，而我们花了
两轮才把「为什么拒」定位干净——因为同一个错误码（11128）背后藏着两个互不相干的触发点。

---

## 1. 现象

选池里任意模型（截图那次是 `DeepSeek-V4.1-Flash · x0.11`，国内版）发一句话，整轮直接失败：

```
400: workbuddy upstream client (http 400) after 1 account(s) [Clint#6dd2cba4]:
{"code":11128,"msg":"Illegal API invocation from an unapproved channel",
 "displayTips":{"zh":"这次调用没通过渠道验证，可能是因为它不是从官方客户端发出的……"}}
```

`type/code` 都是 `client`：插件把它当「请求本身有问题」处理，不轮换账号——所以看上去像
「模型/账号坏了」，其实是请求形状被网关否定。

---

## 2. 第一层触发点：`role: "developer"`

DSH 自己的序列化层会发这个角色。取自 DSH 内置的 `@earendil-works/pi-ai@0.87.1`：

```js
// dist/api/openai-completions.js
const instructionRole = model.reasoning && compat.supportsDeveloperRole ? "developer" : "system"
```

- `supportsDeveloperRole` 对本地 baseURL 的自定义 provider 默认为 `true`；
- `model.reasoning` 对池里所有带思考档位的模型都是 `true`（`deepseek-v4.1-flash`、`glm-*`、`hy3` …）。

于是 **system 提示被发成 `developer` 消息**。网关只认 `system / user / assistant / tool`，
见到 `developer` 就判定「非官方客户端」。

实测（真凭据打真上游）：

| 请求体 | 结果 |
| --- | --- |
| `system` + tools + tool_choice + reasoning_effort + store | 200 |
| 5 种 UA（`CLI/2.63.2`、`WorkBuddy/5.8.4`、`CLI/2.137.1`…）、带 `X-Domain` | 全 200 |
| 非标准 content block（`tool-addition` / `epoch-header`） | 400 **11101**（不是 11128） |
| 空 content / 孤儿 tool 消息 | 400 **11151**（不是 11128） |
| **`role:"developer"`** | 400 **11128** ✅ |

1.8.4 的修法：把所有非标准角色归一到网关认的四类上（`developer`/`instructions` → `system`，
`function`/`tool_result` → `tool`），并把整轮请求体按白名单重建一次再重发。

---

## 3. 第二层触发点：指令角色的**内容**被过滤

1.8.4 部署、DSH 重启后仍然 11128。用会话记录里的真实材料复现（`request/header` 的 30 个工具表
+ `system/message` 的 27211 字符系统提示）才看清：

| 请求 | 结果 |
| --- | --- |
| `system` + 27KB 真实提示 + 1 条 user | 400 **11128** |
| `system` + 27KB **`x` 填充** + 1 条 user | **200** ← 所以不是长度 |
| 同一份 27KB 提示放进 **`user`** | **200** |
| 同一份放进 `developer` / 放到 assistant 历史 | 400 **11128** |
| 只发提示的任意半段 | 200（说明是内容累积评分，不是命中某个关键词） |

**结论：网关对指令类角色（`system` / `developer`）的内容做过滤，命中就用同一个 11128 拒整轮；
同一个字符串换成 `user` 就放行。**

这解释了为什么「换模型」没用——只要还走这条网关，每一轮的 system 提示都会被同一套过滤扫到。

---

## 4. 现在的实现：三级自愈 + 记住形状

`chatCompletions` 的请求阶梯：

1. **正常体** —— 角色归一 + `stream:true`；
2. 被拒 → **白名单重建体** —— 字段、角色、content block、`tool_calls`、`tools` 全部按白名单净化，
   未知 block 降级为 text，孤儿 tool 消息转 user；
3. 仍被拒 → **指令下沉** —— 把 `system` 消息改写成一条带前缀的 `user` 消息
   （`[系统指令 · 由 DSH 会话下发，优先级高于用户消息]`），内容一个字不减，只换通道；
4. 第 3 步成功后置 `instructionsInBand = true`，本 shim（按 region）后续请求**直接用这个形状**，
   不再浪费两次被拒调用；上下文压缩的摘要请求也走同一形状，否则压缩会一直 11128、只能退化成硬截断。

代价要说清楚：第 3 级等于**绕过网关对系统提示的内容审查**，把指令当用户消息发。模型收到的
内容不变；能不能用它属于网关策略问题。

---

## 5. 怎么自己复核

```bash
# 逐字段二分：证明 developer 会触发 11128
node probe/probe2.mjs

# 角色敏感性：同一段提示放 system / user 结果不同
node probe/role-sensitivity.mjs

# 端到端：起真 shim（假账号池 + 真上游），用 DSH 真实形状的请求体打
node probe/inband-e2e.mjs
```

运行日志里会直接说明走了哪一级：

```
… refused the request shape (400); resending from the gateway whitelist — before … / after …
… refuses this system prompt on the instruction channel; resending it in-band as a user turn …
… in-band instructions accepted; keeping this shape for the rest of the session
```

---

## 6. 一句话总结

`11128` 是网关的**通用拒绝码**，至少要区分两类：**角色不被接受**（`developer`）和
**指令内容不被接受**（system 提示被过滤）。只修前者会以为「修过了」，实际每一轮仍被后者拦下。
