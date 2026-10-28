import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { createWorkBuddyShim, WorkBuddyUpstreamClient } from "../lib/index.js"

const data = JSON.parse(await readFile(new URL("./data/failing-request.json", import.meta.url), "utf8"))
const doc = JSON.parse(await readFile(join(process.env.LOCALAPPDATA, "CodeBuddyExtension", "Data", "Public", "auth", "workbuddy-desktop.info"), "utf8"))
const credential = {
  accessToken: doc.auth.accessToken, refreshToken: doc.auth.refreshToken ?? "", expiresAtMs: Date.now() + 3600_000,
  uid: doc.account.uid, uin: doc.account.uin, domain: doc.auth.domain ?? "", enterpriseId: doc.account.enterpriseId ?? "", nickname: doc.account.nickname,
}
const account = { id: "acct", label: "Clint#6dd2cba4", credential, modelCooldowns: {}, rateLimitHits: 0 }
const pool = {
  async acquire() { return account },
  unavailableReason() { return { reason: "none", total: 1, cooling: 0, dead: 0 } },
  penalize() {}, penalizeExhausted() {}, penalizeCredentialDead() {}, noteServed() {}, noteCredits() {},
  async refreshAccount() { return true }, status() { return { accounts: [account], cooling: 0 } },
}
const logs = []
const shim = createWorkBuddyShim({ pool, client: new WorkBuddyUpstreamClient(), catalog: { current: () => [], visible: () => [] }, region: "cn", logger: { warn: (...a) => logs.push(a.join(" ")), info: () => {} } })
await shim.ready
const tools = data.tools.map(t => ({ type: "function", function: { name: t.name, description: t.description ?? "", parameters: t.parameters ?? { type: "object", properties: {} } } }))
const body = JSON.stringify({ model: "deepseek-v4.1-flash",
  messages: [{ role: "developer", content: data.system }, { role: "user", content: [{ type: "text", text: "你好" }] }],
  stream: true, stream_options: { include_usage: true }, store: false, reasoning_effort: "high", max_completion_tokens: 32000, tools })
for (const label of ["第1次", "第2次"]) {
  const res = await fetch(`${shim.baseUrl()}/v1/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${shim.token()}` }, body })
  const text = await res.text()
  const first = text.split("\n").find(l => l.startsWith("data: ") && l.length > 20) ?? text
  console.log(res.status, label, "::", first.replace(/\s+/g, " ").slice(0, 90))
}
for (const l of logs) console.log("LOG:", l.slice(0, 150))
await shim.close()
