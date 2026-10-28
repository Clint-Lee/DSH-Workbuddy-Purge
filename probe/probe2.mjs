// 探针 2：逐字段二分，找出触发 11128 (channel verification) 的字段。
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const AUTH_FILE = join(process.env.LOCALAPPDATA, 'CodeBuddyExtension', 'Data', 'Public', 'auth', 'workbuddy-desktop.info')
const doc = JSON.parse(await readFile(AUTH_FILE, 'utf8'))
const token = doc.auth.accessToken
const uid = doc.account.uid
const CHAT_BASE = 'https://copilot.tencent.com'

const UA = 'CLI/2.63.2 CodeBuddy/2.63.2'
const headers = {
  'Accept': 'application/json, text/plain, */*',
  'X-Requested-With': 'XMLHttpRequest',
  'Origin': 'https://www.codebuddy.cn',
  'Referer': 'https://www.codebuddy.cn/',
  'User-Agent': UA,
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
  'X-User-Id': uid,
  'X-No-Enterprise-Id': '1',
  'X-No-Department-Info': '1',
  'X-Product': 'SaaS',
}

const tool = {
  type: 'function',
  function: {
    name: 'bash',
    description: 'run a shell command',
    parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] },
  },
}

const base = () => ({
  model: 'deepseek-v4.1-flash',
  messages: [{ role: 'user', content: 'ping' }],
  stream: true,
  max_tokens: 8,
})

const cases = {}
const add = (name, mutate) => { const b = base(); mutate(b); cases[name] = b }

add('00-base', () => {})
add('01-tools', b => { b.tools = [tool] })
add('02-tools+auto', b => { b.tools = [tool]; b.tool_choice = 'auto' })
add('03-tool_choice-only', b => { b.tool_choice = 'auto' })
add('04-parallel_tool_calls', b => { b.tools = [tool]; b.parallel_tool_calls = true })
add('05-stream_options', b => { b.stream_options = { include_usage: true } })
add('06-developer-role', b => { b.messages = [{ role: 'developer', content: 'x' }, ...b.messages] })
add('07-reasoning_effort', b => { b.reasoning_effort = 'high' })
add('08-system-long', b => { b.messages = [{ role: 'system', content: 'y'.repeat(30000) }, ...b.messages] })
add('09-content-parts', b => { b.messages = [{ role: 'user', content: [{ type: 'text', text: 'ping' }] }] })
add('10-extra-unknown-field', b => { b.channel = 'cli' })
add('11-large-max_tokens', b => { b.max_tokens = 32000 })
add('12-temperature+top_p', b => { b.temperature = 0; b.top_p = 1 })
add('13-stream-false', b => { b.stream = false })
add('14-tool-result-history', b => {
  b.tools = [tool]
  b.messages = [
    { role: 'user', content: 'run ls' },
    { role: 'assistant', content: '', tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'bash', arguments: '{"command":"ls"}' } }] },
    { role: 'tool', tool_call_id: 'call_1', content: 'a.txt' },
  ]
})

for (const [name, body] of Object.entries(cases)) {
  const url = `${CHAT_BASE}/v2/chat/completions`
  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    const text = await res.text()
    const flat = text.replace(/\s+/g, ' ')
    const code = (() => { try { return JSON.parse(text).code } catch { return undefined } })()
    const tag = res.status === 200 ? 'OK  ' : `FAIL`
    console.log(`${tag} ${name} http=${res.status} code=${code ?? '-'} :: ${flat.slice(0, 170)}`)
  } catch (e) {
    console.log(`ERR  ${name} :: ${e}`)
  }
}
