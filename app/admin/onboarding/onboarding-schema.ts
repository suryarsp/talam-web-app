import { z } from 'zod'

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']

function imageFile(requiredMessage: string) {
  return z
    .instanceof(File, { message: requiredMessage })
    .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), 'Only PNG, JPEG, or SVG images are supported')
}

export const onboardingSchema = z
  .object({
    storeName: z.string().trim().min(1, 'Store name is required'),
    category: z.string().min(1, 'Select a category'),
    customCategory: z.string().trim().optional(),
    brandColor: z.string().min(1),
    // Optional in the schema: a File is only required on first upload — once a logo
    // is saved to Cloudinary, revisiting this step shouldn't force a re-upload.
    // The "must have a logo at all" check happens in the wizard against logoUrl.
    brandLogo: imageFile('Upload a store logo').optional(),
    contactPhone: z
      .string()
      .trim()
      .min(1, 'Phone number is required')
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit phone number'),
    contactEmail: z.string().trim().min(1, 'Enter a valid email').email('Enter a valid email'),
    branchName: z.string().trim().min(1, 'Branch name is required'),
    branchAddress: z.string().trim().min(5, 'Enter a complete address'),
    branchCity: z.string().trim().min(1, 'City is required'),
    tagline: z.string().trim().min(1, 'Tagline is required'),
    aboutDescription: z.string().trim().min(1, 'Tell customers your story'),
    subscriptionTier: z.enum(['starter', 'growth', 'pro'], { message: 'Choose a plan' }),
    paymentId: z.enum(['upi', 'razorpay', 'instamojo']),
    upiAddress: z
      .string()
      .trim()
      .min(1, 'UPI address is required')
      .regex(/^[\w.-]+@[\w]+$/, 'Enter a valid UPI address (e.g. name@upi)'),
  })
  .superRefine((values, ctx) => {
    if (values.category === 'Other' && !values.customCategory?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['customCategory'], message: 'Enter your store category' })
    }
  })

export type OnboardingValues = z.infer<typeof onboardingSchema>

export const STEP_FIELDS: Record<number, (keyof OnboardingValues)[]> = {
  0: ['storeName', 'category', 'customCategory'],
  1: ['brandLogo'],
  2: ['contactPhone', 'contactEmail', 'branchName', 'branchAddress', 'branchCity'],
  3: ['tagline', 'aboutDescription'],
  4: ['subscriptionTier'],
  5: ['upiAddress'],
}
