// 探针 7：非标准 content block 类型 / DSH 专有结构是否触发 11128
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

const run = async (name, messages) => {
  const body = JSON.stringify({ model: 'deepseek-v4.1-flash', messages, stream: true })
  const res = await fetch('https://copilot.tencent.com/v2/chat/completions', { method: 'POST', headers, body })
  const text = await res.text()
  let code; try { code = JSON.parse(text).code } catch { }
  console.log(`${res.status === 200 ? 'OK   ' : (code === 11128 ? '11128' : 'FAIL ')} ${name} http=${res.status} code=${code ?? '-'} :: ${text.replace(/\s+/g, ' ').slice(0, 140)}`)
}

const blocks = [
  'tool-addition', 'epoch-header', 'thinking', 'redacted-thinking', 'tool-result',
  'document', 'file', 'image', 'input_audio', 'cache_control', 'text-delta', 'unknown-type',
]
for (const type of blocks) {
  await run(`block:${type}`, [{ role: 'user', content: [{ type, text: 'hi' }] }])
}
await run('role-system+block-text', [{ role: 'system', content: [{ type: 'text', text: 'hi' }] }, { role: 'user', content: 'go' }])
await run('role-system+block-epoch-header', [{ role: 'system', content: [{ type: 'epoch-header', text: 'hi' }] }, { role: 'user', content: 'go' }])
