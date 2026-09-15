import cors from 'cors'
import express from 'express'
import fs from 'fs/promises'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import multer from 'multer'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { createDrive, uploadToDrive } from './drive.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

loadEnv(path.join(ROOT, '.env'))

const PORT = Number(process.env.PORT) || 3001
const HOST = process.env.HOST || '0.0.0.0'
const TMP_DIR = path.join(os.tmpdir(), 'nisan-uploads')
const DIST = path.join(ROOT, 'dist')
const MAX_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 100) * 1024 * 1024
const MAX_FILES = 12
const driveClient = createDrive()

const IMAGE_MIME = /^(image\/(jpeg|jpg|png|webp|gif|heic|heif|bmp|tiff))$/i
const VIDEO_MIME = /^(video\/(mp4|quicktime|webm|3gpp|x-m4v|mpeg))$/i
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|bmp|tiff)$/i
const VIDEO_EXT = /\.(mp4|mov|webm|3gp|m4v|mpeg|mpg)$/i

if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true })

function loadEnv(filePath) {
  if (!existsSync(filePath)) return
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const text = line.trim()
    if (!text || text.startsWith('#')) continue
    const index = text.indexOf('=')
    if (index === -1) continue
    const key = text.slice(0, index).trim()
    const value = text.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

function isImage(file) {
  return IMAGE_MIME.test(file.mimetype) || IMAGE_EXT.test(file.originalname || '')
}

function isVideo(file) {
  return VIDEO_MIME.test(file.mimetype) || VIDEO_EXT.test(file.originalname || '')
}

function isAllowed(file) {
  return isImage(file) || isVideo(file)
}

function extFrom(file) {
  const fromName = path.extname(file.originalname || '').toLowerCase()
  if (fromName) return fromName
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
  }
  return map[file.mimetype] || ''
}

function safeName(value, fallback) {
  const cleaned = String(value || '')
    .replace(/[^\p{L}\p{N}._\-\s]+/gu, '')
    .trim()
    .slice(0, 80)
  return cleaned || fallback
}

const storage = multer.diskStorage({
  destination: TMP_DIR,
  filename: (req, file, cb) => {
    cb(null, `${randomUUID()}${extFrom(file)}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (isAllowed(file)) cb(null, true)
    else cb(new Error('Sadece fotoğraf ve video yükleyebilirsiniz.'))
  },
})

async function convertHeic(buffer) {
  const { default: heicConvert } = await import('heic-convert')
  return heicConvert({
    buffer: Buffer.from(buffer),
    format: 'JPEG',
    quality: 0.82,
  })
}

async function processImage(file) {
  const sourcePath = file.path
  const id = path.parse(file.filename).name
  const isHeic = /\.hei[cf]$/i.test(file.originalname || file.filename) || /heic|heif/i.test(file.mimetype)
  let input = sourcePath

  if (isHeic) {
    const buf = await fs.readFile(sourcePath)
    const jpeg = await convertHeic(buf)
    const converted = path.join(TMP_DIR, `${id}.jpg`)
    await fs.writeFile(converted, jpeg)
    if (converted !== sourcePath) {
      await fs.unlink(sourcePath).catch(() => {})
    }
    input = converted
    file.filename = `${id}.jpg`
    file.path = converted
    file.mimetype = 'image/jpeg'
  }

  const displayName = `${id}.jpg`
  const displayPath = path.join(TMP_DIR, displayName)

  try {
    await sharp(input)
      .rotate()
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 84 })
      .toFile(displayPath + '.tmp')
  } catch (err) {
    if (displayPath === input) {
      return {
        storedPath: input,
        storedName: path.basename(input),
        mime: file.mimetype || 'image/jpeg',
        type: 'image',
      }
    }
    throw err
  }

  if (displayPath !== input) {
    await fs.unlink(input).catch(() => {})
  }
  await fs.rename(displayPath + '.tmp', displayPath)
  file.path = displayPath
  file.filename = displayName
  file.mimetype = 'image/jpeg'

  return {
    storedPath: displayPath,
    storedName: displayName,
    mime: 'image/jpeg',
    type: 'image',
  }
}

async function processVideo(file) {
  return {
    storedPath: file.path,
    storedName: file.filename,
    mime: file.mimetype || 'video/mp4',
    type: 'video',
  }
}

const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
}))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, drive: Boolean(driveClient) })
})

app.post('/api/upload', (req, res, next) => {
  upload.array('files', MAX_FILES)(req, res, (err) => {
    if (!err) return next()
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: `Dosya çok büyük (en fazla ${Math.round(MAX_BYTES / 1024 / 1024)} MB).` })
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Bir seferde en fazla 12 dosya yükleyebilirsiniz.' })
      }
    }
    return res.status(400).json({ error: err.message || 'Yükleme başarısız.' })
  })
}, async (req, res) => {
  const files = req.files || []
  if (!files.length) {
    return res.status(400).json({ error: 'Lütfen en az bir fotoğraf veya video seçin.' })
  }
  if (!driveClient) {
    for (const file of files) await fs.unlink(file.path).catch(() => {})
    return res.status(503).json({ error: 'Google Drive henüz ayarlanmadı.' })
  }

  const guestName = String(req.body.guestName || '').trim().slice(0, 60)
  const processedPaths = []
  let count = 0

  try {
    for (const file of files) {
      const processed = isImage(file)
        ? await processImage(file)
        : await processVideo(file)
      processedPaths.push(processed.storedPath)

      const original = safeName(file.originalname, processed.storedName)
      const who = safeName(guestName, 'Misafir')
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      const driveName = `${stamp}_${who}_${original}`

      await uploadToDrive(driveClient, {
        filePath: processed.storedPath,
        mime: processed.mime,
        name: driveName,
        description: guestName ? `Yükleyen: ${guestName}` : 'Misafir yüklemesi',
      })
      count += 1
    }

    res.status(201).json({ ok: true, count })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Dosya Google Drive’a yüklenirken bir sorun oluştu.' })
  } finally {
    for (const filePath of processedPaths) {
      await fs.unlink(filePath).catch(() => {})
    }
    for (const file of files) {
      await fs.unlink(file.path).catch(() => {})
    }
  }
})

if (existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(DIST, 'index.html'))
  })
}

const server = app.listen(PORT, HOST, () => {
  console.log(`Nişan anı sunucusu: http://${HOST}:${PORT}`)
  console.log(driveClient ? 'Google Drive bağlı.' : 'Google Drive ayarlı değil.')
})

server.timeout = 5 * 60 * 1000
server.keepAliveTimeout = 65 * 1000
server.headersTimeout = 70 * 1000
