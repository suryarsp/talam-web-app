'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, X } from 'lucide-react'

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getContactSettingsAction, updateContactSettingsAction, addGalleryPhotoAction, removeGalleryPhotoAction } from './actions'
import { contactInfoSchema, type ContactInfoValues } from './contact-info-schema'
import { SectionLabel, Toggle } from './settings-shared'

function RequiredMark() {
  return <span className="text-destructive"> *</span>
}

function OptionalMark() {
  return <span className="text-muted-foreground font-normal"> (optional)</span>
}

const MAX_GALLERY_PHOTOS = 8
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

function validateGalleryFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'Only PNG, JPEG, or WEBP images are supported.'
  if (file.size > MAX_PHOTO_BYTES) return 'Photo must be under 5MB.'
  return null
}

function GalleryDropzone({ gallery, onAdd, onRemove, error }: { gallery: string[]; onAdd: (file: File) => void; onRemove: (url: string) => void; error: string }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto">
        {gallery.map((url) => (
          <div key={url} className="group relative size-24 shrink-0 overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(url)}
              className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {gallery.length < MAX_GALLERY_PHOTOS && (
          <label
            className={`flex size-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-warm transition-colors hover:border-brand-primary ${
              isDragging ? 'border-brand-primary bg-brand-primary/5' : 'border-border'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              const file = e.dataTransfer.files?.[0]
              if (file) onAdd(file)
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) onAdd(file)
              }}
            />
            <ImagePlus className="size-5" strokeWidth={1.5} />
            <span className="text-2xs font-medium">Drop or click</span>
          </label>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      <p className="mt-1.5 text-xs text-muted-warm">Max {MAX_GALLERY_PHOTOS} photos, 5MB each (PNG/JPEG/WEBP). Appears on your About page and social share previews.</p>
    </div>
  )
}

export function ContactInfoTab() {
  const [loaded, setLoaded] = useState(false)
  const [gallery, setGallery] = useState<string[]>([])
  const [galleryError, setGalleryError] = useState('')
  const [saved, setSaved] = useState(false)

  const form = useForm<ContactInfoValues>({
    resolver: zodResolver(contactInfoSchema),
    mode: 'onTouched',
    defaultValues: {
      ownerName: '',
      ownerTitle: '',
      contactPhone: '',
      contactEmail: '',
      sameAsContact: false,
      whatsappNumber: '',
      showWhatsappButton: true,
      address: '',
      city: '',
      hours: '',
    },
  })

  useEffect(() => {
    getContactSettingsAction().then((data) => {
      form.reset({
        ownerName: data.ownerName,
        ownerTitle: data.ownerTitle,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        sameAsContact: Boolean(data.whatsappNumber) && data.whatsappNumber === data.contactPhone,
        whatsappNumber: data.whatsappNumber,
        showWhatsappButton: data.showWhatsappButton,
        address: data.address,
        city: data.city,
        hours: data.hours,
      })
      setGallery(data.galleryUrls)
      setLoaded(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: ContactInfoValues) {
    await updateContactSettingsAction({
      contactPhone: values.contactPhone,
      contactEmail: values.contactEmail,
      address: values.address ?? '',
      city: values.city ?? '',
      ownerName: values.ownerName ?? '',
      ownerTitle: values.ownerTitle ?? '',
      whatsappNumber: values.sameAsContact ? values.contactPhone : (values.whatsappNumber ?? ''),
      showWhatsappButton: values.showWhatsappButton,
      hours: values.hours ?? '',
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleAddPhoto(file: File) {
    setGalleryError('')
    const validationError = validateGalleryFile(file)
    if (validationError) {
      setGalleryError(validationError)
      return
    }
    const result = await addGalleryPhotoAction(file)
    if (result.error) {
      setGalleryError(result.error)
      return
    }
    if (result.url) setGallery((prev) => [...prev, result.url!])
  }

  async function handleRemovePhoto(url: string) {
    setGallery((prev) => prev.filter((u) => u !== url))
    await removeGalleryPhotoAction(url)
  }

  const sameAsContact = form.watch('sameAsContact')
  const contactPhone = form.watch('contactPhone')

  if (!loaded) return <p className="py-12 text-center text-sm text-muted-warm">Loading…</p>

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-8">
        <div>
          <SectionLabel>Owner</SectionLabel>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="ownerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Owner Name
                    <OptionalMark />
                  </FormLabel>
                  <FormControl>
                    <Input {...field} className="h-auto rounded-lg px-3 py-[11px] text-md" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ownerTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Title / Role
                    <OptionalMark />
                  </FormLabel>
                  <FormControl>
                    <Input {...field} className="h-auto rounded-lg px-3 py-[11px] text-md" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <SectionLabel right={saved ? <span className="text-xs font-medium text-success">✓ Saved</span> : undefined}>Contact Details</SectionLabel>
          <div className="flex flex-col gap-4">
            <div data-tour="contact-info" className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Contact Phone
                      <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" inputMode="tel" maxLength={10} className="h-auto rounded-lg px-3 py-[11px] text-md" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Contact Email
                      <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="email" inputMode="email" className="h-auto rounded-lg px-3 py-[11px] text-md" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="whatsappNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    WhatsApp Number
                    <OptionalMark />
                  </FormLabel>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-border bg-surface px-3 py-[9px] text-sm text-muted-warm">+91</span>
                    <FormControl>
                      <Input
                        {...field}
                        value={sameAsContact ? contactPhone : field.value}
                        disabled={sameAsContact}
                        type="tel"
                        inputMode="tel"
                        maxLength={10}
                        className="h-auto min-w-0 flex-1 rounded-lg px-3 py-[9px] text-md disabled:opacity-60"
                      />
                    </FormControl>
                    <FormField
                      control={form.control}
                      name="sameAsContact"
                      render={({ field: sameField }) => (
                        <label className="flex shrink-0 items-center gap-1.5 text-sm text-muted-warm">
                          <input
                            type="checkbox"
                            checked={sameField.value}
                            onChange={(e) => sameField.onChange(e.target.checked)}
                            className="size-4 accent-brand-primary"
                          />
                          Same as contact phone
                        </label>
                      )}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showWhatsappButton"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-md font-semibold text-fg">Show WhatsApp Button on Store</p>
                    <p className="text-xs text-muted-warm">Floating button visible to all visitors</p>
                  </div>
                  <Toggle checked={field.value} onChange={field.onChange} />
                </div>
              )}
            />
          </div>
        </div>

        <div data-tour="store-address">
          <SectionLabel>Store Address</SectionLabel>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Address
                    <OptionalMark />
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} className="rounded-lg px-3 py-[11px] text-md" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    City
                    <OptionalMark />
                  </FormLabel>
                  <FormControl>
                    <Input {...field} className="h-auto rounded-lg px-3 py-[11px] text-md" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-warm">Shown on your About page and used for delivery estimates.</p>
        </div>

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="self-start rounded-lg bg-brand-primary px-5 py-[9px] text-sm font-semibold text-surface transition-transform active:scale-95 disabled:opacity-60"
        >
          {form.formState.isSubmitting ? 'Saving…' : 'Save Contact Info'}
        </button>

        <div>
          <SectionLabel>Store Photos</SectionLabel>
          <GalleryDropzone gallery={gallery} onAdd={handleAddPhoto} onRemove={handleRemovePhoto} error={galleryError} />
        </div>

        <div>
          <SectionLabel>Store Hours</SectionLabel>
          <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Hours
                  <OptionalMark />
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Mon – Sat: 10 AM – 7 PM · Sunday: Closed" className="h-auto rounded-lg px-3 py-[11px] text-md" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  )
}
