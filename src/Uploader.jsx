import { useRef, useState } from 'react'
import { prepareFile } from './compress'
import { UPLOAD_URL, USE_DRIVE_SCRIPT } from './config'
import { CameraMark } from './Ornaments'

const MAX_BYTES = USE_DRIVE_SCRIPT ? 20 * 1024 * 1024 : 100 * 1024 * 1024

function validate(file) {
  const type = file.type || ''
  const name = file.name || ''
  const ok =
    type.startsWith('image/') ||
    type.startsWith('video/') ||
    /\.(jpe?g|png|webp|gif|heic|heif|bmp|mp4|mov|webm|3gp|m4v)$/i.test(name)
  if (!ok) return `${file.name} desteklenmiyor.`
  if (file.size > MAX_BYTES) {
    return USE_DRIVE_SCRIPT
      ? `${file.name} 20 MB sınırının üzerinde.`
      : `${file.name} 100 MB sınırının üzerinde.`
  }
  return null
}

export default function Uploader() {
  const [guestName, setGuestName] = useState('')
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [dragging, setDragging] = useState(false)
  const libraryRef = useRef(null)
  const cameraRef = useRef(null)
  const busy = status === 'preparing' || status === 'uploading'

  async function handleFiles(fileList) {
    const incoming = Array.from(fileList || [])
    if (!incoming.length) return

    const errors = incoming.map(validate).filter(Boolean)
    if (errors.length) {
      setStatus('error')
      setMessage(errors[0])
      return
    }

    setStatus('preparing')
    setProgress(0)
    setMessage('Anılar hazırlanıyor…')

    try {
      if (!UPLOAD_URL) {
        throw new Error('Drive yükleme adresi henüz eklenmedi.')
      }

      const prepared = []
      for (const file of incoming) {
        prepared.push(await prepareFile(file))
      }

      setStatus('uploading')
      setMessage('Drive’a yükleniyor…')

      const count = USE_DRIVE_SCRIPT
        ? await sendToDrive(prepared, guestName.trim(), setProgress)
        : await sendForm(toForm(prepared, guestName.trim()), setProgress)
      setStatus('success')
      setProgress(1)
      setMessage(
        count === 1
          ? 'Teşekkürler, anınız bize ulaştı.'
          : `Teşekkürler, ${count} anınız bize ulaştı.`,
      )
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Yükleme başarısız oldu.')
    } finally {
      if (libraryRef.current) libraryRef.current.value = ''
      if (cameraRef.current) cameraRef.current.value = ''
    }
  }

  return (
    <section
      className={`uploader${dragging ? ' is-drag' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        handleFiles(event.dataTransfer.files)
      }}
    >
      <div className="upload-intro">
        <CameraMark />
        <div>
          <p className="upload-kicker">Anı bırakın</p>
          <p className="upload-copy">Galerinizden seçin, kamerayı açın ya da dosyayı buraya sürükleyin.</p>
        </div>
      </div>

      <label className="name-field">
        <span>Adınız</span>
        <input
          type="text"
          maxLength={60}
          placeholder="İsteğe bağlı"
          value={guestName}
          onChange={(event) => setGuestName(event.target.value)}
        />
      </label>

      <div className="upload-actions">
        <button
          type="button"
          className="btn primary"
          onClick={() => libraryRef.current?.click()}
          disabled={busy}
        >
          Fotoğraf / video seç
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => cameraRef.current?.click()}
          disabled={busy}
        >
          Kamerayı aç
        </button>
      </div>

      <input
        ref={libraryRef}
        className="sr-only"
        type="file"
        accept="image/*,video/*,.heic,.heif,.mov"
        multiple
        onChange={(event) => handleFiles(event.target.files)}
      />
      <input
        ref={cameraRef}
        className="sr-only"
        type="file"
        accept="image/*,video/*"
        capture="environment"
        onChange={(event) => handleFiles(event.target.files)}
      />

      {busy && (
        <div className="progress" role="status">
          <div className="progress-bar">
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p>{message}</p>
        </div>
      )}

      {status === 'success' && <p className="note success">{message}</p>}
      {status === 'error' && <p className="note error">{message}</p>}
    </section>
  )
}

function toForm(files, guestName) {
  const form = new FormData()
  files.forEach((file) => form.append('files', file))
  form.append('guestName', guestName)
  return form
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const value = String(reader.result)
      resolve(value.slice(value.indexOf(',') + 1))
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function sendToDrive(files, guestName, onProgress) {
  let done = 0
  for (const file of files) {
    const data = await fileToBase64(file)
    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: JSON.stringify({
        guestName,
        name: file.name,
        mime: file.type || 'application/octet-stream',
        data,
      }),
    })
    const text = await response.text()
    let body = {}
    try {
      body = JSON.parse(text)
    } catch {
      body = {}
    }
    if (!response.ok || body.ok === false) {
      throw new Error(body.error || 'Google Drive yüklemesi başarısız oldu.')
    }
    done += 1
    onProgress(done / files.length)
  }
  return done
}

function sendForm(form, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', UPLOAD_URL)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    xhr.onload = () => {
      let body
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        body = {}
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body.count || 0)
      else reject(new Error(body.error || 'Yükleme başarısız oldu.'))
    }
    xhr.onerror = () => reject(new Error('Bağlantı kurulamadı. İnternetinizi kontrol edin.'))
    xhr.send(form)
  })
}
