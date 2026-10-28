// 解码 DSH 的多帧 zstd 会话文件
import fs from 'node:fs'
import zlib from 'node:zlib'

const src = process.argv[2]
const out = process.argv[3]
const buf = fs.readFileSync(src)
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
const starts = []
let pos = 0
while (true) {
  const i = buf.indexOf(MAGIC, pos)
  if (i === -1) break
  starts.push(i)
  pos = i + 4
}
const chunks = []
let frameStarts = []
let i = 0
while (i < starts.length) {
  let ok = false
  for (let j = i + 1; j <= starts.length; j++) {
    const end = j < starts.length ? starts[j] : buf.length
    try {
      const dec = zlib.zstdDecompressSync(buf.subarray(starts[i], end))
      chunks.push(dec)
      ok = true
      i = j
      break
    } catch {
      // 试下一个边界
    }
  }
  if (!ok) {
    console.error('undecodable frame at', starts[i])
    break
  }
}
const all = Buffer.concat(chunks)
fs.writeFileSync(out, all)
console.log('frames', chunks.length, 'bytes', all.length)
