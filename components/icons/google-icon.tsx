import type { SVGProps } from 'react'

export function GoogleIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.36 0-4.36-1.6-5.07-3.74H.9v2.34A9 9 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.93 10.68A5.4 5.4 0 0 1 3.65 9c0-.58.1-1.15.28-1.68V4.98H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.02z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.98L3.93 7.32C4.64 5.18 6.64 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}
