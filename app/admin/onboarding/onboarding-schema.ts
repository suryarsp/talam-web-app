import { z } from 'zod'
import { isValidVpa } from '@/lib/payments/upi'

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']

function imageFile(requiredMessage: string) {
  return z
    .instanceof(File, { message: requiredMessage })
    .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), 'Only PNG, JPEG, or SVG images are supported')
}

export const onboardingSchema = z
  .object({
    storeName: z.string().trim().min(1, 'Store name is required'),
    categories: z.array(z.string()).min(1, 'Select at least one category'),
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
    branchAddress: z
      .string()
      .trim()
      .min(20, 'Address must be at least 20 characters')
      .max(100, 'Address must be at most 100 characters'),
    branchState: z.string().trim().min(1, 'State is required'),
    branchCity: z.string().trim().min(1, 'City is required'),
    tagline: z
      .string()
      .trim()
      .min(20, 'Tagline must be at least 20 characters')
      .max(100, 'Tagline must be at most 100 characters'),
    aboutDescription: z
      .string()
      .trim()
      .min(20, 'About must be at least 20 characters')
      .max(100, 'About must be at most 100 characters'),
    subscriptionTier: z.enum(['starter', 'pro'], { message: 'Choose a plan' }),
    paymentIds: z.array(z.enum(['upi', 'razorpay', 'instamojo'])).min(1, 'Select at least one payment method'),
    upiAddress: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.categories.includes('Other') && !values.customCategory?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['customCategory'], message: 'Enter your store category' })
    }
    if ((values.paymentIds.includes('upi') || values.paymentIds.includes('razorpay')) && !isValidVpa(values.upiAddress ?? '')) {
      ctx.addIssue({ code: 'custom', path: ['upiAddress'], message: 'Enter a valid UPI address (e.g. name@upi)' })
    }
  })

export type OnboardingValues = z.infer<typeof onboardingSchema>

export const STEP_FIELDS: Record<number, (keyof OnboardingValues)[]> = {
  0: ['storeName', 'categories', 'customCategory'],
  1: ['brandLogo'],
  2: ['contactPhone', 'contactEmail', 'branchName', 'branchAddress', 'branchState', 'branchCity'],
  3: ['tagline', 'aboutDescription'],
  4: ['subscriptionTier'],
  5: ['paymentIds', 'upiAddress'],
}
