import { readFile } from "node:fs/promises"
import { join } from "node:path"
const data = JSON.parse(await readFile(new URL("./data/failing-request.json", import.meta.url), "utf8"))
const doc = JSON.parse(await readFile(join(process.env.LOCALAPPDATA, "CodeBuddyExtension", "Data", "Public", "auth", "workbuddy-desktop.info"), "utf8"))
const headers = {
  Accept: "application/json, text/plain, */*", "X-Requested-With": "XMLHttpRequest",
  Origin: "https://www.codebuddy.cn", Referer: "https://www.codebuddy.cn/",
  "User-Agent": "CLI/2.63.2 CodeBuddy/2.63.2", "Content-Type": "application/json",
  Authorization: `Bearer ${doc.auth.accessToken}`, "X-User-Id": doc.account.uid,
  "X-No-Enterprise-Id": "1", "X-No-Department-Info": "1", "X-Product": "SaaS", "X-Domain": doc.auth.domain ?? "www.workbuddy.cn",
}
const test = async (label, body) => {
  const res = await fetch("https://copilot.tencent.com/v2/chat/completions", { method: "POST", headers, body: JSON.stringify(body) })
  const raw = await res.text()
  let code; try { code = JSON.parse(raw).code } catch {}
  console.log(`${res.status === 200 ? "OK   " : "FAIL "} ${label} code=${code ?? "-"} :: ${raw.replace(/\s+/g," ").slice(0,90)}`)
  return res.status === 200
}
const tools = data.tools.map(t => ({ type: "function", function: { name: t.name, description: t.description ?? "", parameters: t.parameters ?? { type: "object", properties: {} } } }))
const sys = data.system
const hist = [
  { role: "user", content: "你好" },
  { role: "assistant", content: "你好，有什么可以帮你？" },
  { role: "user", content: "看一下这个插件的报错" },
]
const base = { model: "deepseek-v4.1-flash", stream: true, store: false, reasoning_effort: "high", max_completion_tokens: 32000, tools }

await test("S1 system + hist + tools", { ...base, messages: [{ role: "system", content: sys }, ...hist] })
await test("S2 system→user + hist + tools", { ...base, messages: [{ role: "user", content: sys }, ...hist] })
await test("S3 system→user(前缀) + hist + tools", { ...base, messages: [{ role: "user", content: "以下是本轮的系统指令，请严格遵守：\n" + sys }, ...hist] })
