import { ChevronDown, ImagePlus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { STEP_ACCENTS, STEPS } from './onboarding-data'

export function StepTitle({
  step,
  title,
  description,
  mobileTitle,
  mobileDescription,
}: {
  readonly step: number
  readonly title: string
  readonly description: string
  readonly mobileTitle?: string
  readonly mobileDescription?: string
}) {
  const accent = STEP_ACCENTS[step - 1]
  return (
    <div className="mb-11 animate-[fadeIn_0.2s_ease-out] md:mb-11">
      <p className={['font-body text-xs font-medium uppercase leading-tight tracking-[0.08em] transition-colors duration-500', accent.text].join(' ')}>Step {step} of {STEPS.length}</p>
      <h1 className="mt-2.5 font-heading text-[32px] font-bold leading-[36px] tracking-[-0.02em] text-[#1F2937] md:text-[36px] md:leading-[44px]">
        {mobileTitle ? <span className="md:hidden">{mobileTitle}</span> : null}
        <span className={mobileTitle ? 'hidden md:inline' : undefined}>{title}</span>
      </h1>
      <p className="mt-2 font-body text-base leading-6 text-[#6B7280]">
        {mobileDescription ? <span className="md:hidden">{mobileDescription}</span> : null}
        <span className={mobileDescription ? 'hidden md:inline' : undefined}>{description}</span>
      </p>
    </div>
  )
}

export function Field({
  label,
  error,
  children,
}: {
  readonly label: string
  readonly error?: string
  readonly children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-body text-sm font-medium leading-[18px] text-[#374151]">{label}</span>
      {children}
      {error ? <span className="font-body text-xs font-medium leading-tight text-danger">{error}</span> : null}
    </label>
  )
}

export function TextInput({
  invalid,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { readonly invalid?: boolean }) {
  return (
    <input
      {...props}
      className={[
        'h-14 rounded-xl border bg-surface px-5 font-body text-base leading-5 text-[#1F2937] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-2 focus:shadow-[0_0_0_4px_#4F3FF014]',
        invalid ? 'border-danger focus:border-danger' : 'border-[#E5E7EB] focus:border-brand-primary',
        className ?? '',
      ].join(' ')}
    />
  )
}

export function TextArea({
  invalid,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { readonly invalid?: boolean }) {
  return (
    <textarea
      {...props}
      rows={5}
      className={[
        'resize-none rounded-xl border bg-surface px-5 py-4 font-body text-base leading-6 text-[#1F2937] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-2 focus:shadow-[0_0_0_4px_#4F3FF014]',
        invalid ? 'border-danger focus:border-danger' : 'border-[#E5E7EB] focus:border-brand-primary',
        className ?? '',
      ].join(' ')}
    />
  )
}

export function SelectField({
  children,
  value,
  onChange,
  onBlur,
  invalid,
}: {
  readonly children: React.ReactNode
  readonly value?: string
  readonly onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void
  readonly onBlur?: () => void
  readonly invalid?: boolean
}) {
  return (
    <span className="relative">
      <select
        className={[
          'h-[52px] w-full appearance-none rounded-xl border bg-surface px-5 pr-12 font-body text-base leading-5 text-[#1F2937] outline-none',
          invalid ? 'border-danger' : 'border-[#E5E7EB] focus:border-brand-primary',
        ].join(' ')}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-5 top-1/2 size-4 -translate-y-1/2 text-[#6B7280]" />
    </span>
  )
}

export function FieldHint({ children }: { readonly children: React.ReactNode }) {
  return <span className="mt-[-6px] font-body text-[13px] leading-tight text-[#6B7280]">{children}</span>
}

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/svg+xml'

export function FileDropzone({
  hint,
  file,
  onFileChange,
  boxClassName,
  existingUrl,
}: {
  readonly hint: string
  readonly file: File | null | undefined
  readonly onFileChange: (file: File | null) => void
  readonly boxClassName?: string
  /** Already-uploaded image URL (e.g. from Cloudinary) to show when no new file is picked yet. */
  readonly existingUrl?: string | null
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const previewUrl = objectUrl ?? existingUrl ?? null

  return (
    <div>
      <p className="mt-0.5 font-body text-xs leading-tight text-[#6B7280]">{hint}</p>
      <label
        className={[
          'mt-2.5 flex cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 border-dashed px-3 text-center transition-colors hover:border-brand-primary',
          isDragging ? 'border-brand-primary bg-brand-primary/5' : 'border-[#D1D5DB] bg-[#F9FAFB]',
          boxClassName ?? 'size-[120px]',
        ].join(' ')}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          const dropped = event.dataTransfer.files?.[0] ?? null
          if (dropped) onFileChange(dropped)
        }}
      >
        <input
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="size-full object-cover" />
        ) : (
          <>
            <ImagePlus className="size-7 text-[#9CA3AF]" strokeWidth={1.5} />
            <span className="font-body text-2xs font-medium leading-[14px] text-[#9CA3AF]">{file ? file.name : 'Upload'}</span>
          </>
        )}
      </label>
    </div>
  )
}
