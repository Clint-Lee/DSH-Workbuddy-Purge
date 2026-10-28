import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { WorkBuddyUpstreamClient } from "../src/upstream.ts"

const doc = JSON.parse(await readFile(join(process.env.LOCALAPPDATA, "CodeBuddyExtension", "Data", "Public", "auth", "workbuddy-desktop.info"), "utf8"))
const credential = {
  accessToken: doc.auth.accessToken,
  refreshToken: doc.auth.refreshToken ?? "",
  expiresAtMs: 0,
  uid: doc.account.uid,
  uin: doc.account.uin,
  domain: doc.auth.domain ?? "",
  enterpriseId: doc.account.enterpriseId ?? "",
  nickname: doc.account.nickname,
}

const client = new WorkBuddyUpstreamClient()
const rawBody = JSON.stringify({
  model: "deepseek-v4.1-flash",
  messages: [
    { role: "developer", content: "You are a coding agent." },
    { role: "user", content: [{ type: "text", text: "你好" }] },
  ],
  stream: true,
  stream_options: { include_usage: true },
  store: false,
  max_completion_tokens: 32000,
  reasoning_effort: "high",
})

const prepared = client.prepareChatBody(rawBody)
console.log("prepared roles:", JSON.parse(prepared).messages.map(m => m.role))

for (const [label, body] of [["raw", rawBody], ["prepared", prepared]]) {
  const r = await client.chatStream(credential, body, AbortSignal.timeout(60000))
  console.log(label, "ok=", r.ok, r.ok ? "" : `kind=${r.kind} status=${r.status} msg=${String(r.message).slice(0, 120)}`)
}
