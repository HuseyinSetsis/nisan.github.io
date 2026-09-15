# İremsu & Hüseyin — Nişan anı sayfası

Evet, mümkün. Arayüz GitHub Pages’te durur; misafir yükleyince dosya sizin Google Drive klasörünüze gider.

Tarayıcıdan Drive’a doğrudan yazılamaz: Drive anahtarı GitHub’da olursa herkes klasörünüze ulaşır. Bu yüzden Ubuntu’daki küçük sunucu yalnızca yüklemeyi Drive’a iletir.

```
Telefon → GitHub Pages (site) → Ubuntu /api/upload → Google Drive
```

## 1. Google Drive

1. [Google Cloud Console](https://console.cloud.google.com/) içinde bir proje açın.
2. **Google Drive API**’yi etkinleştirin.
3. **Service account** oluşturup JSON anahtar indirin.
4. Drive’da `Nişan Anıları` klasörü açın, sağ üstten **Paylaş** ile service account e-postasını (`...@....iam.gserviceaccount.com`) **Düzenleyen** yapın.
5. Klasörün ID’sini URL’den kopyalayın: `https://drive.google.com/drive/folders/BURASI`

Sunucuda `.env`:

```
GOOGLE_DRIVE_FOLDER_ID=BURASI
GOOGLE_SERVICE_ACCOUNT_FILE=/opt/nisan/service-account.json
FRONTEND_ORIGIN=https://huseyinoral97.github.io/nisan
```

JSON dosyasını Ubuntu’ya kopyalayın; GitHub’a koymayın.

## 2. Ubuntu (yalnızca API)

```bash
./deploy/sync.sh kullanici@sunucu-ip
```

`.env` ve `service-account.json` sunucuda kalsın. Servis: `deploy/nisan.service`. Nginx yalnızca `/api/` yolunu açar.

## 3. GitHub Pages (arayüz)

Repo Settings → Pages → GitHub Actions.

Secret ekleyin:

- `VITE_UPLOAD_URL` = `https://api.ornek.com/api/upload`

`main` dalına her push sitesini yayınlar.

## Bilgisayarda deneme

```bash
npm install
npm run dev
```

Yerelde Drive yoksa yükleme `Google Drive henüz ayarlanmadı` der. JSON ve klasör ID’sini `.env`’e yazınca aynı `npm run dev` ile Drive’a gider.
