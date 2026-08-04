import { Controller, type Control } from 'react-hook-form'

import { CountHint, Field, FieldHint, StepTitle, TextArea, TextInput } from './onboarding-fields'
import type { OnboardingValues } from './onboarding-schema'

export function StoryStep({ control }: { readonly control: Control<OnboardingValues> }) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle step={4} title="Your story" description="Tell customers who you are and why they should buy from you." />
      <div className="flex flex-col gap-6">
        <Controller
          control={control}
          name="tagline"
          render={({ field, fieldState }) => (
            <Field label="Tagline" error={fieldState.error?.message}>
              <FieldHint>A short line shown near your store name</FieldHint>
              <TextInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={Boolean(fieldState.error)} />
              <CountHint value={field.value ?? ''} min={20} max={100} />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="aboutDescription"
          render={({ field, fieldState }) => (
            <Field label="About your store" error={fieldState.error?.message}>
              <FieldHint>Shown on your About page</FieldHint>
              <TextArea value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={Boolean(fieldState.error)} />
              <CountHint value={field.value ?? ''} min={20} max={100} />
            </Field>
          )}
        />
      </div>
    </div>
  )
}
