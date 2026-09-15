import { useRef, useState } from 'react'
import { prepareFile } from './compress'
import { UPLOAD_URL } from './config'
import { CameraMark } from './Ornaments'

const MAX_BYTES = 100 * 1024 * 1024

function validate(file) {
  const type = file.type || ''
  const name = file.name || ''
  const ok =
    type.startsWith('image/') ||
    type.startsWith('video/') ||
    /\.(jpe?g|png|webp|gif|heic|heif|bmp|mp4|mov|webm|3gp|m4v)$/i.test(name)
  if (!ok) return `${file.name} desteklenmiyor.`
  if (file.size > MAX_BYTES) return `${file.name} 100 MB sınırının üzerinde.`
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
      const prepared = []
      for (const file of incoming) {
        prepared.push(await prepareFile(file))
      }

      const form = new FormData()
      prepared.forEach((file) => form.append('files', file))
      form.append('guestName', guestName.trim())

      setStatus('uploading')
      setMessage('Yükleniyor…')

      const count = await sendForm(form, setProgress)
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
