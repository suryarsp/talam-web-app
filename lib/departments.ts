export const DEPARTMENTS = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'kids', label: 'Kids' },
] as const

export type Department = (typeof DEPARTMENTS)[number]['value']
