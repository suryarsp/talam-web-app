import { Controller, type Control } from 'react-hook-form'

import { Field, FieldHint, FileDropzone, SelectField, StepTitle, TextInput } from './onboarding-fields'
import type { OnboardingValues } from './onboarding-schema'

export function ProductStep({
  control,
  categories,
  existingPhotoUrl,
}: {
  readonly control: Control<OnboardingValues>
  readonly categories: { id: string; name: string }[]
  readonly existingPhotoUrl?: string | null
}) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle
        step={5}
        title="Add your first product"
        description="Upload a product photo, set the price, and stock quantity."
      />
      <div className="flex flex-col gap-6">
        <Controller
          control={control}
          name="productName"
          render={({ field, fieldState }) => (
            <Field label="Product name" error={fieldState.error?.message}>
              <FieldHint>E.g., &quot;Cotton Saree&quot; or &quot;Blue Kurta&quot;</FieldHint>
              <TextInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={Boolean(fieldState.error)} />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <Field label="Category">
              <SelectField value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectField>
            </Field>
          )}
        />
        <Controller
          control={control}
          name="productPhoto"
          render={({ field, fieldState }) => (
            <div>
              <span className="font-body text-sm font-medium leading-[18px] text-[#374151]">Product photo</span>
              <FileDropzone
                hint="High-quality photo (min 500×500px)"
                file={field.value}
                onFileChange={field.onChange}
                existingUrl={existingPhotoUrl}
              />
              {fieldState.error ? (
                <span className="mt-1.5 block font-body text-xs font-medium text-danger">{fieldState.error.message}</span>
              ) : null}
            </div>
          )}
        />
        <Controller
          control={control}
          name="productPrice"
          render={({ field, fieldState }) => (
            <Field label="Price" error={fieldState.error?.message}>
              <FieldHint>Selling price in INR</FieldHint>
              <div
                className={[
                  'flex h-14 items-center gap-1 rounded-xl border bg-surface px-5',
                  fieldState.error ? 'border-danger' : 'border-[#E5E7EB]',
                ].join(' ')}
              >
                <span className="font-body text-base text-[#9CA3AF]">₹</span>
                <input
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputMode="numeric"
                  className="h-full w-full bg-transparent font-body text-base text-[#1F2937] outline-none"
                />
              </div>
            </Field>
          )}
        />
        <Controller
          control={control}
          name="productStock"
          render={({ field, fieldState }) => (
            <Field label="Stock quantity" error={fieldState.error?.message}>
              <FieldHint>How many units do you have?</FieldHint>
              <TextInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputMode="numeric" invalid={Boolean(fieldState.error)} />
            </Field>
          )}
        />
      </div>
    </div>
  )
}
