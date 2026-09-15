const MAX_EDGE = 1920
const JPEG_QUALITY = 0.82

function isCompressibleImage(file) {
  const type = file.type || ''
  const name = file.name || ''
  if (/heic|heif/i.test(type) || /\.hei[cf]$/i.test(name)) return false
  if (type === 'image/gif') return false
  return type.startsWith('image/') || /\.(jpe?g|png|webp|bmp)$/i.test(name)
}

export async function prepareFile(file) {
  if (!isCompressibleImage(file) || file.size < 900_000) return file

  try {
    const bitmap = await createImageBitmap(file)
    let { width, height } = bitmap
    if (width > MAX_EDGE || height > MAX_EDGE) {
      const ratio = Math.min(MAX_EDGE / width, MAX_EDGE / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    })

    if (!blob || blob.size >= file.size) return file
    const base = file.name.replace(/\.[^.]+$/, '') || 'foto'
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
