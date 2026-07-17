import { BRAND_COLORS, type BrandColor } from './onboarding-data'
import { FileDropzone, StepTitle } from './onboarding-fields'

export function BrandStep({
  brandColor,
  setBrandColor,
  brandLogo,
  setBrandLogo,
  errors,
}: {
  readonly brandColor: BrandColor
  readonly setBrandColor: (value: BrandColor) => void
  readonly brandLogo: File | null
  readonly setBrandLogo: (file: File | null) => void
  readonly errors: Record<string, string>
}) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle step={2} title="Brand your store" description="Add a logo and choose your brand colors." />
      <div className="flex flex-col gap-8">
        <div>
          <p className="font-body text-sm font-medium leading-[18px] text-[#374151]">Store logo</p>
          <FileDropzone
            hint="Upload a square image (PNG, JPG). Recommended: 512×512px or larger."
            fileName={brandLogo?.name ?? null}
            onFileChange={setBrandLogo}
          />
          {errors.brandLogo ? <span className="mt-1.5 block font-body text-xs font-medium text-danger">{errors.brandLogo}</span> : null}
        </div>
        <div>
          <p className="font-body text-sm font-medium leading-[18px] text-[#374151]">Brand color</p>
          <p className="mt-0.5 font-body text-xs leading-tight text-[#6B7280]">
            Used for buttons, links, and highlights across your store.
          </p>
          <div className="mt-2.5 flex gap-3">
            {BRAND_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={[
                  'size-[52px] shrink-0 cursor-pointer rounded-xl transition-colors',
                  color === brandColor ? 'border-[3px] border-brand-primary' : 'border-2 border-[#E5E7EB]',
                ].join(' ')}
                style={{ backgroundColor: color }}
                onClick={() => setBrandColor(color)}
                aria-label={`Use ${color}`}
              />
            ))}
          </div>
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
