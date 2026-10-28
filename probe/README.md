# probe/ —— 取证脚本

这些脚本是定位 11128 时用的，**不含任何凭据或私有数据**（已 gitignore）。

## 前置

- 本机已装 WorkBuddy 桌面端并登录（脚本读它自己的 auth 文件）
- Node ≥ 22

## 不依赖外部数据的脚本（可直接跑）

| 脚本 | 作用 |
| --- | --- |
| `probe2.mjs` | 逐字段二分：证明 `role:"developer"` 触发 11128 |
| `probe3.mjs` | DSH 形态请求体（多工具 + 长提示）扫描 |
| `probe4.mjs` | 约 50 个 OpenAI 字段大扫除 |
| `probe5.mjs` | 角色顺序 / 混合形态 |
| `probe6.mjs` | 模型 id 变体（区分 11102） |
| `probe7.mjs` | 非标准 content block 类型（11101） |
| `probe8.mjs` | 与插件完全一致的请求头（含 `X-Domain`）对照 |
| `shim-e2e.mjs` | 端到端：起真 shim（假账号池 + 真上游）打真实形状 |
| `inband-e2e.mjs` | 端到端：三级自愈 + 形状记忆（需 `data/`，见下） |
| `zstd-decode.mjs` | 解码 DSH 多帧 zstd 会话文件 |

## 需要 `probe/data/failing-request.json` 的脚本

`bisect.mjs`、`role-sensitivity.mjs`、`repro-real.mjs`、`full-as-user.mjs`、
`demote-test.mjs`、`inband-e2e.mjs`、`bundle-inband-e2e.mjs` 需要一份「真实失败请求材料」
（系统提示全文 + 工具表）。它含你的私有提示词，**不入库**，自己生成：

```powershell
# 1) 解一个近期会话（多帧 zstd）
node probe/zstd-decode.mjs "$env:USERPROFILE\.dsh\sessions\<项目目录>\<会话id>\session.v4.jsonl.zstd" "$env:TEMP\live.jsonl"

# 2) 抽出失败请求那一轮的系统提示与工具表（seq 传失败事件的序号）
node probe/dump-request.mjs "$env:TEMP\live.jsonl" 910 "probe/data/failing-request.json"
```

`seq` 怎么找：在解码后的 jsonl 里搜 `11128`，取对应事件的 `seq`。

## 说明

- `asar-extract-dsh.mjs` 会把 DSH 的 `app.asar` 解到临时目录，只用于读 pi-ai 的序列化源码。
- 所有脚本都会真的打上游 `copilot.tencent.com`，小请求各消耗极少积分。
