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
const test = async (label, messages) => {
  const body = JSON.stringify({ model: "deepseek-v4.1-flash", messages, stream: true })
  const res = await fetch("https://copilot.tencent.com/v2/chat/completions", { method: "POST", headers, body })
  const raw = await res.text()
  let code; try { code = JSON.parse(raw).code } catch {}
  console.log(`${res.status === 200 ? "OK   " : "FAIL "} ${label} code=${code ?? "-"}`)
}
const full = data.system
await test("full 27k as user", [{ role: "system", content: "short" }, { role: "user", content: full }])
await test("full 27k as user (no system)", [{ role: "user", content: full }, { role: "user", content: "ping" }])
await test("full 27k system again (重测稳定性)", [{ role: "system", content: full }, { role: "user", content: "ping" }])
await test("full 27k developer", [{ role: "developer", content: full }, { role: "user", content: "ping" }])
await test("full 27k assistant-history", [{ role: "system", content: "short" }, { role: "assistant", content: full }, { role: "user", content: "ping" }])
