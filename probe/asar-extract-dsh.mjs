// 从 app.asar 里抽出 /dsh 子树（只用于本地复现 pi-ai 的请求体）
import fs from 'node:fs'
import path from 'node:path'

const asar = 'D:\\Softwares\\DSHarness\\resources\\app.asar'
const outRoot = process.argv[2] ?? 'C:\\Users\\Admin\\AppData\\Local\\Temp\\dsh-extract'
const idx = JSON.parse(fs.readFileSync('C:\\Users\\Admin\\AppData\\Local\\Temp\\asar-index.json', 'utf8'))
const base = idx.base
const fd = fs.openSync(asar, 'r')

const targets = idx.paths.filter(p => p.path.startsWith('/dsh/'))
let files = 0
for (const t of targets) {
  const dest = path.join(outRoot, t.path.slice('/dsh/'.length))
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const off = Number(t.offset)
  const buf = Buffer.alloc(t.size)
  if (t.size > 0 && Number.isFinite(off)) fs.readSync(fd, buf, 0, t.size, base + off)
  fs.writeFileSync(dest, buf)
  files++
}
fs.closeSync(fd)
console.log('extracted', files, 'files to', outRoot)
