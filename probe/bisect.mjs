// 二分定位：系统提示里哪一段让网关吐 11128
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

const test = async (text) => {
  const body = JSON.stringify({ model: 'deepseek-v4.1-flash', messages: [{ role: 'system', content: text }, { role: 'user', content: 'ping' }], stream: true })
  const res = await fetch('https://copilot.tencent.com/v2/chat/completions', { method: 'POST', headers, body })
  const raw = await res.text()
  let code; try { code = JSON.parse(raw).code } catch { }
  return { ok: res.status === 200, code }
}

const full = data.system
console.log('prompt chars', full.length)

// 0) 纯长度对照
const filler = 'x'.repeat(full.length)
console.log('filler same-size:', JSON.stringify(await test(filler)))

// 1) 二分
let bad = full
const seen = new Map()
let round = 0
while (bad.length > 60) {
  round++
  const mid = Math.floor(bad.length / 2)
  const left = bad.slice(0, mid)
  const right = bad.slice(mid)
  const l = await test(left)
  if (!l.ok) { bad = left; console.log(`round ${round}: left ${left.length} FAIL (${l.code})`); continue }
  const r = await test(right)
  if (!r.ok) { bad = right; console.log(`round ${round}: right ${right.length} FAIL (${r.code})`); continue }
  // 两半都过：可能是组合效应，停止二分
  console.log(`round ${round}: 两半单独都过（left=${left.length} right=${right.length}）→ 组合/边界效应`)
  console.log('left head:', JSON.stringify(left.slice(0, 120)))
  console.log('right head:', JSON.stringify(right.slice(0, 120)))
  break
}
console.log('=== 最小失败片段', bad.length, '字符 ===')
console.log(JSON.stringify(bad.slice(0, 800)))
