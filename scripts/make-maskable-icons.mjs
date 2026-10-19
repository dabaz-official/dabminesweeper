/**
 * Generates the maskable PWA icons from the square `any` icons in public/.
 *
 * A maskable icon is cropped to whatever shape the launcher uses, so all of its
 * content has to sit inside the middle 80% circle. The source glyphs reach 84%
 * of the half-width, which would clip the spoke tips, so this re-renders them
 * centred and scaled to 70% of the icon width on the same black field.
 *
 *   node scripts/make-maskable-icons.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync, inflateSync } from 'node:zlib'

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

/** Glyph diameter as a fraction of the icon width. The safe zone is 80%. */
const GLYPH_RATIO = 0.7

const SOURCES = [192, 512]

/** Pixels darker than this on every channel count as the black background. */
const BACKGROUND_THRESHOLD = 20

function decodePng(buffer) {
  let offset = 8
  let width = 0
  let height = 0
  const idat = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    if (type === 'IHDR') {
      width = buffer.readUInt32BE(offset + 8)
      height = buffer.readUInt32BE(offset + 12)
      if (buffer[offset + 8 + 8] !== 8 || buffer[offset + 8 + 9] !== 6) {
        throw new Error('Expected an 8-bit RGBA source image')
      }
    }
    if (type === 'IDAT') idat.push(buffer.subarray(offset + 8, offset + 8 + length))
    offset += 12 + length
    if (type === 'IEND') break
  }

  const raw = inflateSync(Buffer.concat(idat))
  const bpp = 4
  const stride = width * bpp + 1
  const data = Buffer.alloc(width * height * bpp)
  let previous = Buffer.alloc(width * bpp)

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * stride]
    const line = raw.subarray(y * stride + 1, y * stride + 1 + width * bpp)
    const current = Buffer.alloc(width * bpp)
    for (let i = 0; i < width * bpp; i += 1) {
      const a = i >= bpp ? current[i - bpp] : 0
      const b = previous[i]
      const c = i >= bpp ? previous[i - bpp] : 0
      let value = line[i]
      if (filter === 1) value += a
      else if (filter === 2) value += b
      else if (filter === 3) value += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      current[i] = value & 0xff
    }
    current.copy(data, y * width * bpp)
    previous = current
  }

  return { width, height, data }
}

function encodePng(width, height, data) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6

  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0
    data.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const CRC_TABLE = Int32Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typed))
  return Buffer.concat([length, typed, crc])
}

/** Centre and radius of the glyph, measured from the pixels that are not black. */
function measureGlyph(image) {
  let minX = image.width
  let minY = image.height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const i = (y * image.width + x) * 4
      const isGlyph =
        image.data[i] > BACKGROUND_THRESHOLD ||
        image.data[i + 1] > BACKGROUND_THRESHOLD ||
        image.data[i + 2] > BACKGROUND_THRESHOLD
      if (!isGlyph) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  if (maxX < 0) throw new Error('No glyph found in the source image')

  const centreX = (minX + maxX) / 2
  const centreY = (minY + maxY) / 2
  let radius = 0

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const i = (y * image.width + x) * 4
      const isGlyph =
        image.data[i] > BACKGROUND_THRESHOLD ||
        image.data[i + 1] > BACKGROUND_THRESHOLD ||
        image.data[i + 2] > BACKGROUND_THRESHOLD
      if (!isGlyph) continue
      const distance = Math.hypot(x - centreX, y - centreY)
      if (distance > radius) radius = distance
    }
  }

  return { centreX, centreY, radius }
}

/** Area-averages one destination pixel's footprint, treating outside as black. */
function sampleBox(image, centreX, centreY, half) {
  const x0 = centreX - half
  const x1 = centreX + half
  const y0 = centreY - half
  const y1 = centreY + half
  let r = 0
  let g = 0
  let b = 0
  let total = 0

  for (let py = Math.floor(y0); py <= Math.floor(y1); py += 1) {
    const wy = Math.min(py + 1, y1) - Math.max(py, y0)
    if (wy <= 0) continue
    for (let px = Math.floor(x0); px <= Math.floor(x1); px += 1) {
      const wx = Math.min(px + 1, x1) - Math.max(px, x0)
      if (wx <= 0) continue
      const weight = wx * wy
      total += weight
      if (px < 0 || py < 0 || px >= image.width || py >= image.height) continue
      const i = (py * image.width + px) * 4
      r += image.data[i] * weight
      g += image.data[i + 1] * weight
      b += image.data[i + 2] * weight
    }
  }

  if (total === 0) return [0, 0, 0]
  return [r / total, g / total, b / total]
}

function makeMaskable(image, size) {
  const { centreX, centreY, radius } = measureGlyph(image)
  const scale = ((GLYPH_RATIO / 2) * size) / radius
  const half = 0.5 / scale
  const destinationCentre = (size - 1) / 2
  const out = Buffer.alloc(size * size * 4)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = sampleBox(
        image,
        centreX + (x - destinationCentre) / scale,
        centreY + (y - destinationCentre) / scale,
        half,
      )
      const i = (y * size + x) * 4
      out[i] = Math.round(r)
      out[i + 1] = Math.round(g)
      out[i + 2] = Math.round(b)
      out[i + 3] = 255
    }
  }

  return { data: out, scale }
}

for (const size of SOURCES) {
  const source = join(PUBLIC_DIR, `pwa-icon-${size}.png`)
  const target = join(PUBLIC_DIR, `pwa-icon-maskable-${size}.png`)
  const image = decodePng(readFileSync(source))
  if (image.width !== size || image.height !== size) {
    throw new Error(`${source} is ${image.width}x${image.height}, expected ${size}`)
  }

  const { data } = makeMaskable(image, size)
  writeFileSync(target, encodePng(size, size, data))
  console.log(`wrote ${target} (${size}x${size}, glyph at ${GLYPH_RATIO * 100}% width)`)
}
