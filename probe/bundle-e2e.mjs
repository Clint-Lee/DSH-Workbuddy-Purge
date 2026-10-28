import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { createWorkBuddyShim, WorkBuddyUpstreamClient } from "../lib/index.js"

const doc = JSON.parse(await readFile(join(process.env.LOCALAPPDATA, "CodeBuddyExtension", "Data", "Public", "auth", "workbuddy-desktop.info"), "utf8"))
const credential = {
  accessToken: doc.auth.accessToken, refreshToken: doc.auth.refreshToken ?? "",
  expiresAtMs: Date.now() + 3600_000, uid: doc.account.uid, uin: doc.account.uin,
  domain: doc.auth.domain ?? "", enterpriseId: doc.account.enterpriseId ?? "", nickname: doc.account.nickname,
}
const account = { id: "acct", label: "Clint#6dd2cba4", credential, modelCooldowns: {}, rateLimitHits: 0 }
const pool = {
  async acquire() { return account },
  unavailableReason() { return { reason: "none", total: 1, cooling: 0, dead: 0 } },
  penalize() {}, penalizeExhausted() {}, penalizeCredentialDead() {}, noteServed() {}, noteCredits() {},
  async refreshAccount() { return true },
  status() { return { accounts: [account], cooling: 0 } },
}
const logs = []
const shim = createWorkBuddyShim({ pool, client: new WorkBuddyUpstreamClient(), catalog: { current: () => [], visible: () => [] }, region: "cn", logger: { warn: (...a) => logs.push(a.join(" ")), info: () => {} } })
await shim.ready

const tool = (i) => ({ type: "function", function: { name: `tool_${i}`, description: `d${i}`, parameters: { type: "object", properties: { a: { type: "string" } }, required: ["a"] } } })
const bodies = {
  "dsh-real (developer role)": {
    model: "deepseek-v4.1-flash",
    messages: [
      { role: "developer", content: "You are a coding agent.".repeat(50) },
      { role: "user", content: [{ type: "text", text: "你好" }] },
    ],
    stream: true, stream_options: { include_usage: true }, store: false,
    max_completion_tokens: 32000, reasoning_effort: "high",
    tools: Array.from({ length: 5 }, (_, i) => tool(i)),
  },
  "harness extras (unknown blocks/fields)": {
    model: "deepseek-v4.1-flash",
    messages: [
      { role: "system", content: [{ type: "epoch-header", text: "epoch 2" }, { type: "text", text: "sys" }] },
      { role: "user", content: [{ type: "tool-addition", text: "added bash" }, { type: "text", text: "你好" }] },
      { role: "assistant", content: "", tool_calls: [{ id: "c1", type: "function", function: { name: "tool_0", arguments: "{}" } }] },
      { role: "tool", content: "result", tool_call_id: "c1" },
      { role: "user", content: "继续" },
    ],
    stream: true, cache_control: { type: "ephemeral" }, priority: 1, tool_stream: true, metadata: { a: 1 },
    tools: Array.from({ length: 3 }, (_, i) => tool(i)),
  },
}
for (const [name, body] of Object.entries(bodies)) {
  const res = await fetch(`${shim.baseUrl()}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${shim.token()}` },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  const first = text.split("\n").find(l => l.startsWith("data: ") && l.length > 20) ?? text
  console.log(`${res.status} ${name} :: ${first.replace(/\s+/g, " ").slice(0, 120)}`)
}
for (const l of logs) console.log("LOG:", l.slice(0, 200))
await shim.close()
