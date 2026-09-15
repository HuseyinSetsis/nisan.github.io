export const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || (import.meta.env.DEV ? '/api/upload' : '')
export const USE_DRIVE_SCRIPT = /script\.google\.com/i.test(UPLOAD_URL)
