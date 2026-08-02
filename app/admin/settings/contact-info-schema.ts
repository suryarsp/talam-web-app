import { z } from 'zod'

export const contactInfoSchema = z
  .object({
    ownerName: z.string().trim().optional(),
    ownerTitle: z.string().trim().optional(),
    contactPhone: z
      .string()
      .trim()
      .min(1, 'Contact phone is required.')
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number.'),
    contactEmail: z.string().trim().min(1, 'Contact email is required.').email('Enter a valid email address.'),
    sameAsContact: z.boolean(),
    whatsappNumber: z.string().trim().optional(),
    showWhatsappButton: z.boolean(),
    address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    hours: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.sameAsContact && values.whatsappNumber && !/^[6-9]\d{9}$/.test(values.whatsappNumber)) {
      ctx.addIssue({ code: 'custom', path: ['whatsappNumber'], message: 'Enter a valid 10-digit mobile number.' })
    }
  })

export type ContactInfoValues = z.infer<typeof contactInfoSchema>
