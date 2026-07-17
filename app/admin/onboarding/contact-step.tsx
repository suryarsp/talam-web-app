import { Field, FieldHint, StepTitle, TextInput } from './onboarding-fields'

export function ContactStep({
  contactPhone,
  setContactPhone,
  contactEmail,
  setContactEmail,
  branchName,
  setBranchName,
  branchAddress,
  setBranchAddress,
  branchCity,
  setBranchCity,
  errors,
}: {
  readonly contactPhone: string
  readonly setContactPhone: (value: string) => void
  readonly contactEmail: string
  readonly setContactEmail: (value: string) => void
  readonly branchName: string
  readonly setBranchName: (value: string) => void
  readonly branchAddress: string
  readonly setBranchAddress: (value: string) => void
  readonly branchCity: string
  readonly setBranchCity: (value: string) => void
  readonly errors: Record<string, string>
}) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle step={3} title="Contact & address" description="How customers reach you and where you're based." />
      <div className="flex flex-col gap-6">
        <Field label="Contact phone" error={errors.contactPhone}>
          <FieldHint>Shown on your storefront and used for order updates</FieldHint>
          <TextInput
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
            invalid={Boolean(errors.contactPhone)}
            inputMode="tel"
          />
        </Field>
        <Field label="Contact email" error={errors.contactEmail}>
          <FieldHint>Where customers and Talam can reach you</FieldHint>
          <TextInput
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            invalid={Boolean(errors.contactEmail)}
            inputMode="email"
          />
        </Field>
        <Field label="Store name" error={errors.branchName}>
          <FieldHint>E.g., &quot;Main branch&quot; or your shop&apos;s name</FieldHint>
          <TextInput value={branchName} onChange={(event) => setBranchName(event.target.value)} invalid={Boolean(errors.branchName)} />
        </Field>
        <Field label="Address" error={errors.branchAddress}>
          <TextInput value={branchAddress} onChange={(event) => setBranchAddress(event.target.value)} invalid={Boolean(errors.branchAddress)} />
        </Field>
        <Field label="City" error={errors.branchCity}>
          <TextInput value={branchCity} onChange={(event) => setBranchCity(event.target.value)} invalid={Boolean(errors.branchCity)} />
        </Field>
      </div>
    </div>
  )
}
