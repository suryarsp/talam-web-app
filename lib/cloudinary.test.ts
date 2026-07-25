import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { uploadImage } from './cloudinary'

const originalEnv = { ...process.env }

beforeEach(() => {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'demo-cloud'
  process.env.CLOUDINARY_API_KEY = 'key123'
  process.env.CLOUDINARY_API_SECRET = 'secret123'
})

afterEach(() => {
  process.env = { ...originalEnv }
  vi.unstubAllGlobals()
})

describe('uploadImage', () => {
  it('posts a signed request to Cloudinary and returns the secure_url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: 'https://res.cloudinary.com/demo-cloud/logo.png' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const file = new File(['x'], 'logo.png', { type: 'image/png' })
    const url = await uploadImage(file, 'talam/tenant-1/brand')

    expect(url).toBe('https://res.cloudinary.com/demo-cloud/logo.png')
    expect(fetchMock).toHaveBeenCalledWith('https://api.cloudinary.com/v1_1/demo-cloud/image/upload', expect.objectContaining({ method: 'POST' }))
    const body = fetchMock.mock.calls[0][1].body as FormData
    expect(body.get('folder')).toBe('talam/tenant-1/brand')
    expect(body.get('api_key')).toBe('key123')
    expect(body.get('signature')).toEqual(expect.any(String))
  })

  it('throws when Cloudinary responds with a non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, text: async () => 'invalid signature' }))
    const file = new File(['x'], 'logo.png', { type: 'image/png' })
    await expect(uploadImage(file, 'talam/tenant-1/brand')).rejects.toThrow('Cloudinary upload failed')
  })

  it('throws when Cloudinary env vars are missing', async () => {
    delete process.env.CLOUDINARY_API_SECRET
    const file = new File(['x'], 'logo.png', { type: 'image/png' })
    await expect(uploadImage(file, 'talam/tenant-1/brand')).rejects.toThrow('Cloudinary is not configured')
  })
})
