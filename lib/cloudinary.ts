import { createHash } from 'node:crypto'

/**
 * Signed server-side upload to Cloudinary via the raw REST API (no SDK —
 * a signature + fetch is ~20 lines and avoids a dependency for one endpoint).
 */
export async function uploadImage(file: File, folder: string): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary is not configured')

  const timestamp = Math.floor(Date.now() / 1000)
  const signature = createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest('hex')

  const body = new FormData()
  body.append('file', file)
  body.append('api_key', apiKey)
  body.append('timestamp', String(timestamp))
  body.append('folder', folder)
  body.append('signature', signature)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body })
  if (!res.ok) throw new Error(`Cloudinary upload failed: ${await res.text()}`)

  const data = (await res.json()) as { secure_url: string }
  return data.secure_url
}
