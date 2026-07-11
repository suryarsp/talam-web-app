import { Field, FieldHint, SelectField, StepTitle, TextInput } from './onboarding-fields'
import { STORE_TYPES } from './onboarding-data'

export function StoreStep({
  slug,
  storeName,
  setStoreName,
  category,
  setCategory,
  errors,
}: {
  readonly slug: string
  readonly storeName: string
  readonly setStoreName: (value: string) => void
  readonly category: string
  readonly setCategory: (value: string) => void
  readonly errors: Record<string, string>
}) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle
        step={1}
        title="Name your store"
        description="This becomes your unique store URL on Talam."
        mobileTitle="Set up your store"
        mobileDescription="Create your online presence in minutes. You can edit most details later."
      />
      <div className="flex flex-col gap-6">
        <Field label="Store name" error={errors.storeName}>
          <FieldHint>This appears on your homepage</FieldHint>
          <TextInput
            value={storeName}
            onChange={(event) => setStoreName(event.target.value)}
            invalid={Boolean(errors.storeName)}
          />
        </Field>
        <Field label="Website name">
          <FieldHint>Once created, this cannot be changed. Customer would use this to access your store.</FieldHint>
          <TextInput value={slug.replaceAll('-', '')} readOnly />
        </Field>
        <Field label="Category" error={errors.category}>
          <SelectField value={category} onChange={(event) => setCategory(event.target.value)} invalid={Boolean(errors.category)}>
            <option value="">Select a category</option>
            <option>Clothing</option>
            {STORE_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </SelectField>
        </Field>
        <Field label="Your store link">
          <div className="flex h-12 items-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 md:h-[52px]">
            <span className="text-brand-primary">⌁</span>
            <span className="font-body text-sm leading-[18px] text-[#9CA3AF]">{slug.replaceAll('-', '')}.</span>
            <span className="font-body text-sm font-semibold leading-[18px] text-brand-primary">mytalam.com</span>
          </div>
        </Field>
      </div>
    </div>
  )
}
