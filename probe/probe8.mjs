// 探针 8：与插件完全一致的头（含 X-Domain）对比，定位 11128 的真正触发点
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const AUTH_FILE = join(process.env.LOCALAPPDATA, 'CodeBuddyExtension', 'Data', 'Public', 'auth', 'workbuddy-desktop.info')
const doc = JSON.parse(await readFile(AUTH_FILE, 'utf8'))
const uid = doc.account.uid

const mk = (extra) => ({
  'Accept': 'application/json, text/plain, */*',
  'X-Requested-With': 'XMLHttpRequest',
  'Origin': 'https://www.codebuddy.cn',
  'Referer': 'https://www.codebuddy.cn/',
  'User-Agent': 'CLI/2.63.2 CodeBuddy/2.63.2',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${doc.auth.accessToken}`,
  'X-User-Id': uid,
  'X-No-Enterprise-Id': '1',
  'X-No-Department-Info': '1',
  'X-Product': 'SaaS',
  ...extra,
})

const bodySys = (role) => JSON.stringify({
  model: 'deepseek-v4.1-flash',
  messages: [{ role, content: 'you are a coding agent' }, { role: 'user', content: 'hi' }],
  stream: true,
  reasoning_effort: 'high',
})
const bodyPlain = JSON.stringify({ model: 'deepseek-v4.1-flash', messages: [{ role: 'user', content: 'hi' }], stream: true })

const cases = [
  ['plugin-headers + plain body', mk({ 'X-Domain': 'www.workbuddy.cn' }), bodyPlain],
  ['plugin-headers + system body', mk({ 'X-Domain': 'www.workbuddy.cn' }), bodySys('system')],
  ['plugin-headers + reasoning_effort', mk({ 'X-Domain': 'www.workbuddy.cn' }), bodySys('system')],
  ['only X-Domain', mk({ 'X-Domain': 'www.workbuddy.cn' }), bodyPlain],
  ['X-Domain empty', mk({ 'X-Domain': '' }), bodyPlain],
  ['no X-Domain + reasoning', mk({}), bodySys('system')],
  ['developer + X-Domain (期望 11128)', mk({ 'X-Domain': 'www.workbuddy.cn' }), bodySys('developer')],
]

for (const [name, headers, body] of cases) {
  const res = await fetch('https://copilot.tencent.com/v2/chat/completions', { method: 'POST', headers, body })
  const text = await res.text()
  let code; try { code = JSON.parse(text).code } catch { }
  console.log(`${res.status === 200 ? 'OK   ' : 'FAIL '} ${name} http=${res.status} code=${code ?? '-'} :: ${text.replace(/\s+/g, ' ').slice(0, 150)}`)
}
