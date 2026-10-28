import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { WorkBuddyUpstreamClient } from "../src/upstream.ts"

const doc = JSON.parse(await readFile(join(process.env.LOCALAPPDATA, "CodeBuddyExtension", "Data", "Public", "auth", "workbuddy-desktop.info"), "utf8"))
const credential = {
  accessToken: doc.auth.accessToken, refreshToken: doc.auth.refreshToken ?? "", expiresAtMs: 0,
  uid: doc.account.uid, uin: doc.account.uin, domain: doc.auth.domain ?? "",
  enterpriseId: doc.account.enterpriseId ?? "", nickname: doc.account.nickname,
}
const client = new WorkBuddyUpstreamClient()

const tool = (i) => ({ type: "function", function: { name: `tool_${i}`, description: `d${i}`.repeat(40), parameters: { type: "object", properties: { a: { type: "string" } }, required: ["a"], additionalProperties: true } } })
const sys = "You are a coding agent. ".repeat(800)

const variants = {
  "full-realistic": {
    model: "deepseek-v4.1-flash",
    messages: [{ role: "developer", content: sys }, { role: "user", content: [{ type: "text", text: "你好" }] }],
    stream: true, stream_options: { include_usage: true }, store: false,
    max_completion_tokens: 128000, reasoning_effort: "high",
    tools: Array.from({ length: 25 }, (_, i) => tool(i)), tool_choice: "auto",
  },
  "no-tools": {
    model: "deepseek-v4.1-flash",
    messages: [{ role: "developer", content: sys }, { role: "user", content: [{ type: "text", text: "你好" }] }],
    stream: true, stream_options: { include_usage: true }, store: false,
    max_completion_tokens: 128000, reasoning_effort: "high",
  },
}

for (const [name, body] of Object.entries(variants)) {
  const prepared = client.prepareChatBody(JSON.stringify(body))
  const r = await client.chatStream(credential, prepared, AbortSignal.timeout(90000))
  console.log(name, "->", r.ok ? "OK" : `FAIL kind=${r.kind} status=${r.status} :: ${String(r.message).slice(0, 160)}`)
}
