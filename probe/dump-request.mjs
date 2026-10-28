// 从会话记录里抽出那次失败请求的真实材料（系统提示 / 工具表 / 历史消息）
import fs from 'node:fs'

const lines = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/).filter(Boolean)
const evs = []
for (const line of lines) {
  try { evs.push(JSON.parse(line)) } catch { /* skip */ }
}
const before = Number(process.argv[3] ?? 910)

const header = evs.filter(e => e.type === 'request/header' && e.seq < before).pop()
const systemEvent = evs.filter(e => e.type === 'system/message').pop()
const systemText = (systemEvent.data.message?.content ?? systemEvent.data.content)?.[0]?.text ?? ''

const messages = []
for (const e of evs) {
  if (e.seq >= before) break
  const m = e.data?.message
  if (!m) continue
  if (e.type !== 'user/message' && e.type !== 'assistant/message') continue
  const content = Array.isArray(m.content) ? m.content : []
  const text = content.filter(b => b.type === 'text').map(b => b.text).join('')
  if (text === '' && (m.tool_calls ?? []).length === 0) continue
  messages.push({
    role: m.role,
    ...text === '' ? {} : { content: text },
    ...m.role === 'assistant' && (m.tool_calls ?? []).length > 0 ? { tool_calls: m.tool_calls } : {},
  })
}

const tools = header.data.header.tools ?? []
const out = { config: header.data.header.config, tools, system: systemText, messages }
fs.writeFileSync(process.argv[4], JSON.stringify(out, null, 1))
console.log('config', JSON.stringify(out.config))
console.log('tools', tools.length, 'toolNames', tools.map(t => t.name).join(','))
console.log('systemChars', systemText.length, 'messages', messages.length)
console.log('roles', JSON.stringify(messages.reduce((acc, m) => { acc[m.role] = (acc[m.role] ?? 0) + 1; return acc }, {})))
