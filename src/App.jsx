import headerFloral from './assets/header-floral.jpg'
import { HeartMark, Rule } from './Ornaments'
import QrPrint from './QrPrint'
import Uploader from './Uploader'
import './App.css'

function isQrPath() {
  const path = window.location.pathname.replace(/\/$/, '')
  if (path.endsWith('/qr')) return true
  if (new URLSearchParams(window.location.search).has('qr')) return true
  return window.location.hash.replace(/^#\/?/, '') === 'qr'
}

export default function App() {
  if (isQrPath()) return <QrPrint />

  return (
    <main className="page">
      <article className="invite">
        <img className="hero-art" src={headerFloral} alt="" />
        <div className="invite-inner">
          <header className="hero">
            <p className="eyebrow">Nişanımıza hoş geldiniz</p>
            <h1 className="names">
              İremsu <HeartMark /> Hüseyin
            </h1>
            <p className="script-line">Birlikte güzel anılar biriktirelim…</p>
            <p className="lede">
              Çektiğiniz fotoğraf ve videoları buradan bizimle paylaşabilirsiniz.
            </p>
          </header>

          <Rule />
          <Uploader />
          <p className="closing">İyi eğlenceler</p>
        </div>
      </article>
    </main>
  )
}
