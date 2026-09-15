import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import headerFloral from './assets/header-floral.jpg'
import { HeartMark } from './Ornaments'

export default function QrPrint() {
  const [url, setUrl] = useState(() => window.location.origin.replace(/\/qr\/?$/, ''))
  const [dataUrl, setDataUrl] = useState('')
  const printable = useMemo(() => url.trim(), [url])

  useEffect(() => {
    if (!printable) return undefined
    let cancelled = false
    QRCode.toDataURL(printable, {
      width: 720,
      margin: 1,
      color: { dark: '#1a2c78', light: '#f7f8fc' },
    }).then((value) => {
      if (!cancelled) setDataUrl(value)
    })
    return () => {
      cancelled = true
    }
  }, [printable])

  return (
    <main className="page">
      <article className="invite qr-card">
        <img className="hero-art" src={headerFloral} alt="" />
        <div className="invite-inner">
          <p className="eyebrow">Nişanımıza hoş geldiniz</p>
          <h1 className="names">
            İremsu <HeartMark /> Hüseyin
          </h1>
          <p className="script-line">Karttaki kareye yerleştirilecek QR</p>

          <label className="name-field">
            <span>Yayın adresi</span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>

          {dataUrl && (
            <figure className="qr-figure">
              <img src={dataUrl} alt="Nişan anı QR kodu" />
            </figure>
          )}

          <div className="upload-actions">
            {dataUrl && (
              <a className="btn primary" href={dataUrl} download="nisan-qr.png">
                QR kodu indir
              </a>
            )}
            <button type="button" className="btn ghost" onClick={() => window.print()}>
              Yazdır
            </button>
          </div>

          <p className="hint">
            Ubuntu sunucusundaki adresi yazın, karekodu indirip davetiye kartındaki boş kareye koyun.
          </p>
        </div>
      </article>
    </main>
  )
}
