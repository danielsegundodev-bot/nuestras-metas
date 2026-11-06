// Generates the PWA icons (interlocking green/orange rings on white).
// Pure Node, no dependencies: rasterizes with 4x4 supersampling and encodes PNG via zlib.
// Usage: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const GREEN = [0x34, 0xc7, 0x59]
const ORANGE = [0xff, 0x95, 0x00]
const WHITE = [0xff, 0xff, 0xff]
// Geometry in unit space (0..1)
const R = 0.21
const STROKE = 0.075
const LEFT = { x: 0.385, y: 0.5 }
const RIGHT = { x: 0.615, y: 0.5 }

function onRing(px, py, c) {
  const d = Math.hypot(px - c.x, py - c.y)
  return Math.abs(d - R) <= STROKE / 2
}

// Chain-link effect: orange is on top, except in the upper half where green passes over.
function colorAt(px, py) {
  const g = onRing(px, py, LEFT)
  const o = onRing(px, py, RIGHT)
  if (g && o) return py < 0.5 ? GREEN : ORANGE
  if (g) return GREEN
  if (o) return ORANGE
  return WHITE
}

function render(size) {
  const ss = 4
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = colorAt((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size)
          r += c[0]
          g += c[1]
          b += c[2]
        }
      }
      const n = ss * ss
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = Math.round(r / n)
      raw[o + 1] = Math.round(g / n)
      raw[o + 2] = Math.round(b / n)
      raw[o + 3] = 255
    }
  }
  return encodePng(size, size, raw)
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function encodePng(w, h, raw) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const S = 512
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
  <rect width="${S}" height="${S}" fill="#FFFFFF"/>
  <defs><clipPath id="top"><rect width="${S}" height="${S / 2}"/></clipPath></defs>
  <g fill="none" stroke-width="${STROKE * S}">
    <circle cx="${LEFT.x * S}" cy="${LEFT.y * S}" r="${R * S}" stroke="#34C759"/>
    <circle cx="${RIGHT.x * S}" cy="${RIGHT.y * S}" r="${R * S}" stroke="#FF9500"/>
    <circle cx="${LEFT.x * S}" cy="${LEFT.y * S}" r="${R * S}" stroke="#34C759" clip-path="url(#top)"/>
  </g>
</svg>
`

const out = new URL('../public/', import.meta.url)
writeFileSync(new URL('icon.svg', out), svg)
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(new URL(name, out), render(size))
}
console.log('icons written to public/')
