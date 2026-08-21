import { z } from 'zod'

export const shippingConnectSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter the email you use to sign in to Shiprocket.')
    .email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your Shiprocket password.'),
  pickupLocation: z
    .string()
    .trim()
    .min(1, 'Enter the pickup location nickname from your Shiprocket dashboard.')
    .max(100, 'Pickup location must be 100 characters or fewer.'),
})

export type ShippingConnectValues = z.infer<typeof shippingConnectSchema>
