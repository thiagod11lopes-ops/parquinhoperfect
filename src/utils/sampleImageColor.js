/**
 * Samples the dominant opaque edge/corner color from an image (logo fill color).
 * @param {string} src
 * @returns {Promise<string>} hex color e.g. #f97316
 */
export function sampleImageFillColor(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('Sem imagem'))
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 48
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          reject(new Error('Canvas indisponível'))
          return
        }
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)

        const buckets = new Map()

        const push = (x, y) => {
          const i = (y * size + x) * 4
          const a = data[i + 3]
          if (a < 140) return
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const key = `${r >> 4},${g >> 4},${b >> 4}`
          const prev = buckets.get(key)
          if (prev) {
            prev.count += 1
            prev.r += r
            prev.g += g
            prev.b += b
          } else {
            buckets.set(key, { count: 1, r, g, b })
          }
        }

        for (let i = 0; i < size; i += 1) {
          push(i, 0)
          push(i, size - 1)
          push(0, i)
          push(size - 1, i)
          if (i < 4 || i > size - 5) {
            push(i, 1)
            push(i, size - 2)
            push(1, i)
            push(size - 2, i)
          }
        }

        if (buckets.size === 0) {
          // Fallback: average all opaque pixels
          let count = 0
          let r = 0
          let g = 0
          let b = 0
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 140) continue
            r += data[i]
            g += data[i + 1]
            b += data[i + 2]
            count += 1
          }
          if (!count) {
            resolve('#f97316')
            return
          }
          resolve(toHex(r / count, g / count, b / count))
          return
        }

        let best = null
        for (const entry of buckets.values()) {
          if (!best || entry.count > best.count) best = entry
        }

        resolve(toHex(best.r / best.count, best.g / best.count, best.b / best.count))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Não foi possível ler a logo'))
    img.src = src
  })
}

function toHex(r, g, b) {
  const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}
