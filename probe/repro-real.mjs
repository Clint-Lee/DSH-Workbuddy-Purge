// 用真实系统提示 + 真实 30 个工具表复现 11128，并逐项定位
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

const toWire = (t) => ({ type: 'function', function: { name: t.name, description: t.description ?? '', parameters: t.parameters ?? { type: 'object', properties: {} } } })

const run = async (label, body) => {
  const res = await fetch('https://copilot.tencent.com/v2/chat/completions', { method: 'POST', headers, body: JSON.stringify(body) })
  const text = await res.text()
  let code; try { code = JSON.parse(text).code } catch { }
  let msg = ''; try { msg = JSON.parse(text).msg } catch { }
  console.log(`${res.status === 200 ? 'OK   ' : 'FAIL '} ${label} http=${res.status} code=${code ?? '-'} ${msg.slice(0, 80)}`)
  return { ok: res.status === 200, code, msg }
}

const sys = data.system
const tools = data.tools.map(toWire)
const base = (messages, extra = {}) => ({ model: 'deepseek-v4.1-flash', messages, stream: true, ...extra })

await run('A system+1user+30tools', base([{ role: 'system', content: sys }, { role: 'user', content: 'ping' }], { tools }))
await run('B system+1user no tools', base([{ role: 'system', content: sys }, { role: 'user', content: 'ping' }]))
await run('C short system+30tools', base([{ role: 'system', content: 'short' }, { role: 'user', content: 'ping' }], { tools }))

// 逐个工具试：哪个工具让上游吐 11128
for (const tool of tools) {
  const r = await run(`tool:${tool.function.name}`, base([{ role: 'system', content: 'short' }, { role: 'user', content: 'ping' }], { tools: [tool] }))
  if (!r.ok && r.code === 11128) console.log('   ^^^ 命中工具:', tool.function.name)
}
