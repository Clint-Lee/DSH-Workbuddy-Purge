// 探针 5：role 顺序 / 混合形态 —— 验证 developer→system 转换后是否仍被拒
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const AUTH_FILE = join(process.env.LOCALAPPDATA, 'CodeBuddyExtension', 'Data', 'Public', 'auth', 'workbuddy-desktop.info')
const doc = JSON.parse(await readFile(AUTH_FILE, 'utf8'))
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
}

const run = async (name, messages, extra = {}) => {
  const body = JSON.stringify({ model: 'deepseek-v4.1-flash', messages, stream: true, ...extra })
  const res = await fetch('https://copilot.tencent.com/v2/chat/completions', { method: 'POST', headers, body })
  const text = await res.text()
  let code; try { code = JSON.parse(text).code } catch { }
  console.log(`${res.status === 200 ? 'OK   ' : (code === 11128 ? '11128' : 'FAIL ')} ${name} http=${res.status} code=${code ?? '-'} :: ${text.replace(/\s+/g, ' ').slice(0, 130)}`)
}

const U = { role: 'user', content: 'hi' }
const A = { role: 'assistant', content: 'hello' }

await run('system-first', [{ role: 'system', content: 'sys' }, U])
await run('system-after-user', [U, { role: 'system', content: 'sys' }])
await run('system-after-user+more', [U, { role: 'system', content: 'sys' }, U])
await run('two-system', [{ role: 'system', content: 'a' }, { role: 'system', content: 'b' }, U])
await run('assistant-first', [A, U])
await run('developer-then-system', [{ role: 'developer', content: 'd' }, { role: 'system', content: 's' }, U])
await run('tool-call-flow', [U, { role: 'assistant', content: 'ok', tool_calls: [{ id: 'c1', type: 'function', function: { name: 'f', arguments: '{}' } }] }, { role: 'tool', tool_call_id: 'c1', content: 'r' }, U], {
  tools: [{ type: 'function', function: { name: 'f', description: 'd', parameters: { type: 'object', properties: {} } } }],
})
await run('empty-string-content', [{ role: 'user', content: '' }])
await run('whitespace-content', [{ role: 'user', content: '   ' }])
await run('assistant-empty-content', [U, { role: 'assistant', content: '' }, U])
