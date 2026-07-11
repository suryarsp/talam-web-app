import { Field, FieldHint, FileDropzone, StepTitle, TextInput } from './onboarding-fields'

export function ProductStep({
  productName,
  setProductName,
  productPrice,
  setProductPrice,
  productStock,
  setProductStock,
  productPhoto,
  setProductPhoto,
  errors,
}: {
  readonly productName: string
  readonly setProductName: (value: string) => void
  readonly productPrice: string
  readonly setProductPrice: (value: string) => void
  readonly productStock: string
  readonly setProductStock: (value: string) => void
  readonly productPhoto: File | null
  readonly setProductPhoto: (file: File | null) => void
  readonly errors: Record<string, string>
}) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle
        step={3}
        title="Add your first product"
        description="Upload a product photo, set the price, and stock quantity."
      />
      <div className="flex flex-col gap-6">
        <Field label="Product name" error={errors.productName}>
          <FieldHint>E.g., &quot;Cotton Saree&quot; or &quot;Blue Kurta&quot;</FieldHint>
          <TextInput
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            invalid={Boolean(errors.productName)}
          />
        </Field>
        <div>
          <span className="font-body text-sm font-medium leading-[18px] text-[#374151]">Product photo</span>
          <FileDropzone
            hint="High-quality photo (min 500×500px)"
            fileName={productPhoto?.name ?? null}
            onFileChange={setProductPhoto}
          />
        </div>
        <Field label="Price" error={errors.productPrice}>
          <FieldHint>Selling price in INR</FieldHint>
          <div
            className={[
              'flex h-14 items-center gap-1 rounded-xl border bg-surface px-5',
              errors.productPrice ? 'border-danger' : 'border-[#E5E7EB]',
            ].join(' ')}
          >
            <span className="font-body text-base text-[#9CA3AF]">₹</span>
            <input
              value={productPrice}
              onChange={(event) => setProductPrice(event.target.value)}
              inputMode="numeric"
              className="h-full w-full bg-transparent font-body text-base text-[#1F2937] outline-none"
            />
          </div>
        </Field>
        <Field label="Stock quantity" error={errors.productStock}>
          <FieldHint>How many units do you have?</FieldHint>
          <TextInput
            value={productStock}
            onChange={(event) => setProductStock(event.target.value)}
            inputMode="numeric"
            invalid={Boolean(errors.productStock)}
          />
        </Field>
      </div>
    </div>
  )
}
