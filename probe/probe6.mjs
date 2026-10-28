// 探针 6：模型 id 变体（大小写/未知 id）是否也会触发 11128
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

const models = [
  'deepseek-v4.1-flash', 'DeepSeek-V4.1-Flash', 'deepseek-v4.1-flash-20250929',
  'deepseek-v4.1', 'unknown-model-xyz', 'workbuddy/deepseek-v4.1-flash', 'claude-sonnet-4-5',
]

for (const model of models) {
  const body = JSON.stringify({ model, messages: [{ role: 'user', content: 'hi' }], stream: true })
  const res = await fetch('https://copilot.tencent.com/v2/chat/completions', { method: 'POST', headers, body })
  const text = await res.text()
  let code; try { code = JSON.parse(text).code } catch { }
  console.log(`${res.status === 200 ? 'OK   ' : 'FAIL '} model=${model} http=${res.status} code=${code ?? '-'} :: ${text.replace(/\s+/g, ' ').slice(0, 150)}`)
}
