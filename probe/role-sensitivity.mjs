// 判断触发方式：角色敏感？片段敏感？分数阈值？
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const data = JSON.parse(await readFile(new URL('./data/failing-request.json', import.meta.url), 'utf8'))
const doc = JSON.parse(await readFile(join(process.env.LOCALAPPDATA, 'CodeBuddyExtension', 'Data', 'Public', 'auth', 'workbuddy-desktop.info'), 'utf8'))
const headers = {
  'Accept': 'application/json, text/plain, */*',
  'X-Requested-With': 'XMLHttpRequest',
  'Origin': 'https://www.codebuddy.cn',
  'Referer': 'https://www.codebuddy.cn/',
  'User-Agent': 'CLI/2.63.2 CodeBuddy/2.63.2',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${doc.auth.accessToken}`,
  'X-User-Id': doc.account.uid,
  'X-No-Enterprise-Id': '1',
  'X-No-Department-Info': '1',
  'X-Product': 'SaaS',
  'X-Domain': doc.auth.domain ?? 'www.workbuddy.cn',
}

const test = async (label, messages) => {
  const body = JSON.stringify({ model: 'deepseek-v4.1-flash', messages, stream: true })
  const res = await fetch('https://copilot.tencent.com/v2/chat/completions', { method: 'POST', headers, body })
  const raw = await res.text()
  let code; try { code = JSON.parse(raw).code } catch { }
  console.log(`${res.status === 200 ? 'OK   ' : 'FAIL '} ${label} code=${code ?? '-'}`)
  return res.status === 200
}

const full = data.system
const win = full.slice(13606, 13606 + 3401) // 上轮定位到的最小失败窗口

await test('1 系统提示(整段 27k)', [{ role: 'system', content: full }, { role: 'user', content: 'ping' }])
await test('2 同上作为 user 消息', [{ role: 'system', content: 'short' }, { role: 'user', content: win }])
await test('3 窗口放 user', [{ role: 'system', content: 'short' }, { role: 'user', content: win }])
await test('4 窗口放 system', [{ role: 'system', content: win }, { role: 'user', content: 'ping' }])
await test('5 窗口拆两条 system', [{ role: 'system', content: win.slice(0, 1700) }, { role: 'system', content: win.slice(1700) }, { role: 'user', content: 'ping' }])
await test('6 窗口塞进 assistant 历史', [{ role: 'system', content: 'short' }, { role: 'assistant', content: win }, { role: 'user', content: 'ping' }])

// 分数阈值：把窗口缩小
for (const size of [3401, 2600, 2000, 1500, 1000, 600]) {
  await test(`7 窗口前 ${size} 字符`, [{ role: 'system', content: win.slice(0, size) }, { role: 'user', content: 'ping' }])
}
