import { Controller, type Control, useWatch } from 'react-hook-form'
import { Loader2 } from 'lucide-react'

import { Field, FieldHint, SelectField, StepTitle, TextInput } from './onboarding-fields'
import { STORE_TYPES } from './onboarding-data'
import type { OnboardingValues } from './onboarding-schema'
import { ROOT_DOMAIN } from '@/lib/tenant-url'

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken'

export function StoreStep({
  control,
  slug,
  serverError,
  slugStatus,
}: {
  readonly control: Control<OnboardingValues>
  readonly slug: string
  readonly serverError: string | null
  readonly slugStatus: SlugStatus
}) {
  const category = useWatch({ control, name: 'category' })
  const slugError = serverError ?? (slugStatus === 'taken' ? 'That store URL is taken — try another.' : undefined)

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
        <Controller
          control={control}
          name="storeName"
          render={({ field, fieldState }) => (
            <Field label="Store name" error={fieldState.error?.message}>
              <FieldHint>This appears on your homepage</FieldHint>
              <TextInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={Boolean(fieldState.error)} />
            </Field>
          )}
        />
        <Field label="Website name" error={slugError}>
          <FieldHint>Once created, this cannot be changed. Customer would use this to access your store.</FieldHint>
          <div className="relative">
            <TextInput value={slug.replaceAll('-', '')} readOnly invalid={Boolean(slugError)} />
            {slugStatus === 'checking' ? (
              <Loader2 className="absolute right-5 top-1/2 size-4 -translate-y-1/2 animate-spin text-[#9CA3AF]" />
            ) : null}
          </div>
          {slugStatus === 'available' && !slugError ? (
            <span className="font-body text-xs font-medium leading-tight text-success">That URL is available.</span>
          ) : null}
        </Field>
        <Controller
          control={control}
          name="category"
          render={({ field, fieldState }) => (
            <Field label="Category" error={fieldState.error?.message}>
              <SelectField
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(fieldState.error)}
                options={[
                  { value: '', label: 'Select a category' },
                  { value: 'Clothing', label: 'Clothing' },
                  ...STORE_TYPES.map((type) => ({ value: type, label: type })),
                ]}
              />
            </Field>
          )}
        />
        {category === 'Other' ? (
          <Controller
            control={control}
            name="customCategory"
            render={({ field, fieldState }) => (
              <Field label="Your category" error={fieldState.error?.message}>
                <FieldHint>Tell us what kind of store this is</FieldHint>
                <TextInput value={field.value ?? ''} onChange={field.onChange} invalid={Boolean(fieldState.error)} />
              </Field>
            )}
          />
        ) : null}
        <Field label="Your store link">
          <div className="flex h-12 items-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 md:h-[52px]">
            <span className="text-brand-primary">⌁</span>
            <span className="font-body text-sm leading-[18px] text-[#9CA3AF]">{slug.replaceAll('-', '')}.</span>
            <span className="font-body text-sm font-semibold leading-[18px] text-brand-primary">{ROOT_DOMAIN}</span>
          </div>
        </Field>
      </div>
    </div>
  )
}
