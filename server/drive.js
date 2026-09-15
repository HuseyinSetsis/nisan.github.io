import { createReadStream, existsSync, readFileSync } from 'fs'
import { google } from 'googleapis'

export function createDrive() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  const filePath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE
  let email = process.env.GOOGLE_CLIENT_EMAIL
  let key = process.env.GOOGLE_PRIVATE_KEY

  if (filePath && existsSync(filePath)) {
    const json = JSON.parse(readFileSync(filePath, 'utf8'))
    email = json.client_email
    key = json.private_key
  }

  if (!folderId || !email || !key) return null

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: String(key).replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })

  return {
    folderId,
    drive: google.drive({ version: 'v3', auth }),
  }
}

export async function uploadToDrive(client, { filePath, mime, name, description }) {
  const { data } = await client.drive.files.create({
    requestBody: {
      name,
      parents: [client.folderId],
      description,
    },
    media: {
      mimeType: mime,
      body: createReadStream(filePath),
    },
    fields: 'id,name',
    supportsAllDrives: true,
  })
  return data
}
