// 探针 3：DSH 真实形态的请求体（多工具、长系统提示、tool_choice 各种拼法）
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const AUTH_FILE = join(process.env.LOCALAPPDATA, 'CodeBuddyExtension', 'Data', 'Public', 'auth', 'workbuddy-desktop.info')
const doc = JSON.parse(await readFile(AUTH_FILE, 'utf8'))
const CHAT_BASE = 'https://copilot.tencent.com'
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

const mkTool = (i) => ({
  type: 'function',
  function: {
    name: `tool_${i}`,
    description: `Description for tool ${i}. `.repeat(20),
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'file path' }, flag: { type: 'boolean' } },
      required: ['path'],
      additionalProperties: false,
    },
  },
})

const sysPrompt = 'You are a coding agent operating in a sandbox. '.repeat(900) // ~45KB

const base = () => ({
  model: 'deepseek-v4.1-flash',
  messages: [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: 'list the files' },
  ],
  stream: true,
})

const cases = {}
const add = (n, f) => { const b = base(); f(b); cases[n] = b }

add('20-dsh-25tools', b => { b.tools = Array.from({ length: 25 }, (_, i) => mkTool(i)) })
add('21-dsh-25tools+auto', b => { b.tools = Array.from({ length: 25 }, (_, i) => mkTool(i)); b.tool_choice = 'auto' })
add('22-tool_choice-name-string', b => { b.tools = [mkTool(0)]; b.tool_choice = 'tool_0' })
add('23-tool_choice-required', b => { b.tools = [mkTool(0)]; b.tool_choice = 'required' })
add('24-tool_choice-object', b => { b.tools = [mkTool(0)]; b.tool_choice = { type: 'function', function: { name: 'tool_0' } } })
add('25-tool-strict', b => { const t = mkTool(0); t.function.strict = true; b.tools = [t] })
add('26-model-auto', b => { b.model = 'auto' })
add('27-max_tokens-plus-tools', b => { b.max_tokens = 32000; b.tools = Array.from({ length: 25 }, (_, i) => mkTool(i)) })
add('28-assistant-reasoning_history', b => {
  b.messages.push(
    { role: 'assistant', content: 'thinking...', reasoning_content: 'deep thought' },
    { role: 'user', content: 'continue' },
  )
})
add('29-tool-history-long', b => {
  const t = mkTool(0)
  b.tools = [t]
  b.messages = [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: 'ls' },
    { role: 'assistant', content: '', tool_calls: [{ id: 'call_a', type: 'function', function: { name: 'tool_0', arguments: '{"path":"."}' } }] },
    { role: 'tool', tool_call_id: 'call_a', content: 'a\nb\nc' },
    { role: 'assistant', content: 'done' },
    { role: 'user', content: 'again' },
  ]
})
add('30-multi-system', b => { b.messages = [{ role: 'system', content: 'a' }, { role: 'system', content: sysPrompt }, ...b.messages.slice(1)] })
add('31-system-parts', b => { b.messages[0] = { role: 'system', content: [{ type: 'text', text: sysPrompt }] } })
add('32-user-image', b => { b.messages[1] = { role: 'user', content: [{ type: 'text', text: 'what is this' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' } }] } })
add('33-extra-body-fields', b => { b.stream_options = { include_usage: true }; b.parallel_tool_calls = true; b.reasoning_effort = 'medium'; b.temperature = 0.3 })
add('34-null-content-assistant', b => { b.messages.push({ role: 'assistant', content: null }) })
add('35-empty-messages', b => { b.messages = [] })
add('36-huge-history', b => { for (let i = 0; i < 60; i++) b.messages.push({ role: 'user', content: 'x'.repeat(3000) }, { role: 'assistant', content: 'y'.repeat(3000) }) })

for (const [name, body] of Object.entries(cases)) {
  const payload = JSON.stringify(body)
  try {
    const res = await fetch(`${CHAT_BASE}/v2/chat/completions`, { method: 'POST', headers, body: payload })
    const text = await res.text()
    let code
    try { code = JSON.parse(text).code } catch { }
    const verdict = res.status === 200 ? 'OK  ' : 'FAIL'
    console.log(`${verdict} ${name} selftest http=${res.status} code=${code ?? '-'} bytes=${payload.length} :: ${text.replace(/\s+/g, ' ').slice(0, 150)}`)
  } catch (e) {
    console.log(`ERR  ${name} :: ${e}`)
  }
}
