import { useEffect, useMemo } from 'react'
import { Controller, type Control, useWatch } from 'react-hook-form'
import { ImagePlus } from 'lucide-react'

import { BRAND_COLORS } from './onboarding-data'
import { StepTitle } from './onboarding-fields'
import type { OnboardingValues } from './onboarding-schema'
import { Attachment, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentDescription, AttachmentTrigger } from '@/components/ui/attachment'

export function BrandStep({
  control,
  existingLogoUrl,
}: {
  readonly control: Control<OnboardingValues>
  readonly existingLogoUrl?: string | null
}) {
  const brandColor = useWatch({ control, name: 'brandColor' })

  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle step={2} title="Brand your store" description="Add a logo and choose your brand colors." />
      <div className="flex flex-col gap-8">
        <div>
          <p className="font-body text-sm font-medium leading-[18px] text-[#374151]">Store logo</p>
          <Controller
            control={control}
            name="brandLogo"
            render={({ field, fieldState }) => (
              <LogoAttachment file={field.value} onFileChange={field.onChange} existingUrl={existingLogoUrl} error={fieldState.error?.message} />
            )}
          />
        </div>
        <div>
          <p className="font-body text-sm font-medium leading-[18px] text-[#374151]">Brand color</p>
          <p className="mt-0.5 font-body text-xs leading-tight text-[#6B7280]">
            Used for buttons, links, and highlights across your store.
          </p>
          <Controller
            control={control}
            name="brandColor"
            render={({ field }) => (
              <div className="mt-2.5 flex gap-3">
                {BRAND_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={[
                      'size-[52px] shrink-0 cursor-pointer rounded-xl transition-colors',
                      color === field.value ? 'border-[3px] border-brand-primary' : 'border-2 border-[#E5E7EB]',
                    ].join(' ')}
                    style={{ backgroundColor: color }}
                    onClick={() => field.onChange(color)}
                    aria-label={`Use ${color}`}
                  />
                ))}
              </div>
            )}
          />
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[#F3F4F6] p-4">
          <span className="size-10 shrink-0 rounded-lg" style={{ backgroundColor: brandColor }} />
          <div className="flex flex-col gap-0.5">
            <span className="font-body text-2xs font-medium uppercase tracking-[0.04em] text-[#6B7280]">Primary</span>
            <span className="font-body text-sm font-semibold leading-tight text-brand-primary">{brandColor}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function LogoAttachment({
  file,
  onFileChange,
  existingUrl,
  error,
}: {
  readonly file: File | null | undefined
  readonly onFileChange: (file: File | null) => void
  readonly existingUrl?: string | null
  readonly error?: string
}) {
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }, [objectUrl])
  const previewUrl = objectUrl ?? existingUrl ?? null

  return (
    <div className="mt-2.5">
      <Attachment orientation="vertical" className="size-[120px]" state={previewUrl ? 'done' : 'idle'}>
        <AttachmentTrigger render={<label />}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="sr-only"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
        </AttachmentTrigger>
        <AttachmentMedia variant={previewUrl ? 'image' : 'icon'} className="size-full">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" />
          ) : (
            <ImagePlus className="size-7" strokeWidth={1.5} />
          )}
        </AttachmentMedia>
        {!previewUrl && (
          <AttachmentContent>
            <AttachmentTitle>Upload</AttachmentTitle>
            <AttachmentDescription>PNG, JPG, or SVG</AttachmentDescription>
          </AttachmentContent>
        )}
      </Attachment>
      {error ? <span className="mt-1.5 block font-body text-xs font-medium text-danger">{error}</span> : null}
    </div>
  )
}
