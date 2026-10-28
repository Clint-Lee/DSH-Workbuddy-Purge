// 探针 4：字段大扫除 —— 找出所有会触发 11128 的 body 特征
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

const base = () => ({
  model: 'deepseek-v4.1-flash',
  messages: [{ role: 'user', content: 'ping' }],
  stream: true,
})

const tool = { type: 'function', function: { name: 'f', description: 'd', parameters: { type: 'object', properties: {} } } }

const cands = {
  'n': b => { b.n = 1 },
  'seed': b => { b.seed = 1 },
  'stop-array': b => { b.stop = ['x'] },
  'user': b => { b.user = 'u1' },
  'logprobs': b => { b.logprobs = false },
  'presence_penalty': b => { b.presence_penalty = 0 },
  'frequency_penalty': b => { b.frequency_penalty = 0 },
  'response_format-json': b => { b.response_format = { type: 'json_object' } },
  'response_format-schema': b => { b.response_format = { type: 'json_schema', json_schema: { name: 'x', schema: { type: 'object' } } } },
  'logit_bias': b => { b.logit_bias = {} },
  'prediction': b => { b.prediction = { type: 'content', content: 'x' } },
  'store': b => { b.store = false },
  'metadata': b => { b.metadata = { a: 'b' } },
  'service_tier': b => { b.service_tier = 'auto' },
  'max_completion_tokens': b => { b.max_completion_tokens = 32 },
  'modalities': b => { b.modalities = ['text'] },
  'audio': b => { b.audio = { format: 'wav', voice: 'alloy' } },
  'web_search_options': b => { b.web_search_options = {} },
  'thinking-enabled': b => { b.thinking = { type: 'enabled', budget_tokens: 1024 } },
  'reasoning-object': b => { b.reasoning = { effort: 'high' } },
  'verbosity': b => { b.verbosity = 'low' },
  'tools-empty': b => { b.tools = [] },
  'functions-legacy': b => { b.functions = [tool.function] },
  'function_call': b => { b.functions = [tool.function]; b.function_call = 'auto' },
  'prompt_cache_key': b => { b.prompt_cache_key = 'k' },
  'safety_identifier': b => { b.safety_identifier = 's' },
  'provider': b => { b.provider = 'openai' },
  'provider_options': b => { b.providerOptions = { x: 1 } },
  'agent': b => { b.agent = 'cli' },
  'channel-field': b => { b.channel = 'cli' },
  'client-field': b => { b.client = 'workbuddy' },
  'system-topfield': b => { b.system = 'sys' },
  'msg-role-tool-noid': b => { b.messages = [{ role: 'tool', content: 'x' }] },
  'msg-role-function': b => { b.messages = [{ role: 'function', name: 'f', content: 'x' }] },
  'msg-role-Dev': b => { b.messages = [{ role: 'Dev', content: 'x' }] },
  'msg-role-developer-in-parts': b => { b.messages = [{ role: 'developer', content: [{ type: 'text', text: 'x' }] }] },
  'msg-extra-cache_control': b => { b.messages = [{ role: 'user', content: 'x', cache_control: { type: 'ephemeral' } }] },
  'msg-name': b => { b.messages = [{ role: 'user', name: 'bob', content: 'x' }] },
  'msg-assistant-empty-toolcalls': b => { b.messages = [{ role: 'assistant', content: '', tool_calls: [] }] },
  'tool-strict-false': b => { b.tools = [{ type: 'function', function: { ...tool.function, strict: false } }] },
  'tool-parallel-false': b => { b.tools = [tool]; b.parallel_tool_calls = false },
  'tool_choice-auto-no-tools': b => { b.tool_choice = 'auto' },
  'stream_options-usage': b => { b.stream_options = { include_usage: true } },
  'top_k': b => { b.top_k = 5 },
  'temperature-int': b => { b.temperature = 1 },
  'messages-string': b => { b.messages = ['ping'] },
  'content-object': b => { b.messages = [{ role: 'user', content: { text: 'x' } }] },
}

const results = []
for (const [name, f] of Object.entries(cands)) {
  const b = base(); f(b)
  try {
    const res = await fetch('https://copilot.tencent.com/v2/chat/completions', {
      method: 'POST', headers, body: JSON.stringify(b),
    })
    const text = await res.text()
    let code; try { code = JSON.parse(text).code } catch { }
    const verdict = res.status === 200 ? 'OK  ' : (code === 11128 ? '11128' : `FAIL`)
    results.push(`${verdict} ${name} http=${res.status} code=${code ?? '-'} :: ${text.replace(/\s+/g, ' ').slice(0, 120)}`)
  } catch (e) {
    results.push(`ERR  ${name} :: ${e}`)
  }
}
for (const r of results) console.log(r)
