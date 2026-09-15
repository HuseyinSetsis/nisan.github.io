const FOLDER_ID = '1WUOl70_sW6ZVTbmxBfjAC3jiMtRoIY_D'

function doGet() {
  return json_({ ok: true })
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    const folder = DriveApp.getFolderById(FOLDER_ID)
    const guest = String(body.guestName || 'Misafir').slice(0, 60)
    const name = String(body.name || 'dosya').replace(/[\\/]/g, '-')
    const mime = body.mime || 'application/octet-stream'
    const bytes = Utilities.base64Decode(body.data)
    const blob = Utilities.newBlob(bytes, mime, name)
    const file = folder.createFile(blob)
    const stamp = Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd_HH-mm-ss')
    file.setName(stamp + '_' + guest + '_' + name)
    file.setDescription('Yükleyen: ' + guest)
    return json_({ ok: true, count: 1 })
  } catch (err) {
    return json_({ ok: false, error: String(err) })
  }
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON)
}
