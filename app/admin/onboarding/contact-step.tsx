import { Controller, type Control } from 'react-hook-form'

import { CountHint, Field, FieldHint, StepTitle, TextInput } from './onboarding-fields'
import type { OnboardingValues } from './onboarding-schema'

export function ContactStep({
  control,
  authProvider,
}: {
  readonly control: Control<OnboardingValues>
  readonly authProvider?: string | null
}) {
  const emailLocked = authProvider === 'google' || authProvider === 'azure'
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle step={3} title="Contact & address" description="How customers reach you and where you're based." />
      <div className="flex flex-col gap-6">
        <Controller
          control={control}
          name="contactPhone"
          render={({ field, fieldState }) => (
            <Field label="Contact phone" error={fieldState.error?.message}>
              <FieldHint>Shown on your storefront and used for order updates</FieldHint>
              <TextInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(fieldState.error)}
                inputMode="tel"
                maxLength={10}
              />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="contactEmail"
          render={({ field, fieldState }) => (
            <Field label="Contact email" error={fieldState.error?.message}>
              <FieldHint>
                {emailLocked ? `Signed in with ${authProvider === 'google' ? 'Google' : 'Microsoft'} — using your account email` : 'Where customers and Talam can reach you'}
              </FieldHint>
              <TextInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(fieldState.error)}
                inputMode="email"
                disabled={emailLocked}
                className={emailLocked ? 'cursor-not-allowed opacity-60' : undefined}
              />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="branchName"
          render={({ field, fieldState }) => (
            <Field label="Branch name" error={fieldState.error?.message}>
              <FieldHint>E.g., &quot;Main branch&quot; or your shop&apos;s name</FieldHint>
              <TextInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={Boolean(fieldState.error)} />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="branchState"
          render={({ field, fieldState }) => (
            <Field label="State" error={fieldState.error?.message}>
              <TextInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={Boolean(fieldState.error)} />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="branchCity"
          render={({ field, fieldState }) => (
            <Field label="City" error={fieldState.error?.message}>
              <TextInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={Boolean(fieldState.error)} />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="branchAddress"
          render={({ field, fieldState }) => (
            <Field label="Address" error={fieldState.error?.message}>
              <TextInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={Boolean(fieldState.error)} />
              <CountHint value={field.value ?? ''} min={20} max={100} />
            </Field>
          )}
        />
      </div>
    </div>
  )
}
