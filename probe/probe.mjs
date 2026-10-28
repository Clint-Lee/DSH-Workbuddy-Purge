// 探针：用本机 WorkBuddy 凭据对上游做通道验证对比实验。
// 用法: node probe/probe.mjs models | chat
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const AUTH_DIR = join(process.env.LOCALAPPDATA, 'CodeBuddyExtension', 'Data', 'Public', 'auth')
const AUTH_FILE = join(AUTH_DIR, 'workbuddy-desktop.info')
const CHAT_BASE = 'https://copilot.tencent.com'

const doc = JSON.parse(await readFile(AUTH_FILE, 'utf8'))
const token = doc.auth.accessToken
const uid = doc.account.uid
const domain = typeof doc.auth.domain === 'string' ? doc.auth.domain : ''
const enterpriseId = typeof doc.account.enterpriseId === 'string' ? doc.account.enterpriseId : ''

console.log('uid', uid, 'domain', JSON.stringify(domain), 'ent', JSON.stringify(enterpriseId), 'tokenLen', token.length)

const baseHeaders = (ua, extra = {}) => ({
  'Accept': 'application/json, text/plain, */*',
  'X-Requested-With': 'XMLHttpRequest',
  'Origin': 'https://www.codebuddy.cn',
  'Referer': 'https://www.codebuddy.cn/',
  'User-Agent': ua,
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
  'X-User-Id': uid,
  'X-No-Enterprise-Id': '1',
  'X-No-Department-Info': '1',
  'X-Product': 'SaaS',
  ...extra,
})

const UAS = {
  'cli-2.63.2 (插件当前)': 'CLI/2.63.2 CodeBuddy/2.63.2',
  'desktop-task-ua (5.5.6/CLI 2.137.1)': 'WorkBuddy/5.5.6 WorkBuddy/5.5.6 CLI/2.137.1',
  'desktop-5.8.4': 'WorkBuddy/5.8.4',
  'desktop-5.8.4 + CLI 2.137.1': 'WorkBuddy/5.8.4 WorkBuddy/5.8.4 CLI/2.137.1',
  'cli-2.137.1': 'CLI/2.137.1 CodeBuddy/2.137.1',
}

async function probeModels() {
  for (const [label, ua] of Object.entries(UAS)) {
    const url = `${CHAT_BASE}/v2/enterprises/personal/models`
    try {
      const res = await fetch(url, { headers: baseHeaders(ua) })
      const text = await res.text()
      let ids = []
      try {
        const j = JSON.parse(text)
        const data = j.data ?? {}
        const agents = Array.isArray(data.agents) ? data.agents : []
        const cli = agents.find(a => a && a.name === 'cli')
        ids = (cli?.models ?? (data.models ?? []).map(m => m.id)).slice(0, 40)
        console.log(`[${label}] ${res.status} code=${j.code} models=${ids.length}`)
        console.log('   ', ids.join(', '))
      } catch {
        console.log(`[${label}] ${res.status} non-json: ${text.slice(0, 120)}`)
      }
    } catch (e) {
      console.log(`[${label}] ERR ${e}`)
    }
  }
}

async function probeChat(model) {
  for (const [label, ua] of Object.entries(UAS)) {
    const url = `${CHAT_BASE}/v2/chat/completions`
    const body = JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'ping' }],
      stream: true,
      max_tokens: 1,
    })
    try {
      const res = await fetch(url, { method: 'POST', headers: baseHeaders(ua), body })
      const text = await res.text()
      console.log(`[${label}] http ${res.status} :: ${text.replace(/\s+/g, ' ').slice(0, 260)}`)
    } catch (e) {
      console.log(`[${label}] ERR ${e}`)
    }
  }
}

const mode = process.argv[2] ?? 'models'
const model = process.argv[3] ?? 'deepseek-v4.1-flash'
if (mode === 'models') await probeModels()
else await probeChat(model)
