import type { SVGProps } from 'react'

export function InstagramIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className} {...props}>
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-grad)" />
      <rect x="6.5" y="6.5" width="11" height="11" rx="3.5" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="16.6" cy="7.4" r="1" fill="#fff" />
    </svg>
  )
}

export function FacebookIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className} {...props}>
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path d="M15.1 12.5h-2v7h-2.9v-7H8.6v-2.5h1.6V8.4c0-1.6.9-2.9 2.9-2.9h2v2.5h-1.3c-.4 0-.6.3-.6.7v1.3h1.9l-.3 2.5z" fill="#fff" />
    </svg>
  )
}

export function YoutubeIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className} {...props}>
      <rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0000" />
      <path d="M10 8.5v7l6-3.5-6-3.5z" fill="#fff" />
    </svg>
  )
}

export function WhatsappIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className} {...props}>
      <circle cx="12" cy="12" r="10" fill="#25D366" />
      <path
        d="M12 6a6 6 0 0 0-5.2 9l-.7 2.6 2.7-.7A6 6 0 1 0 12 6Zm3 8.4c-.1.4-.8.7-1.1.8-.3 0-.6.1-1.9-.4-1.6-.6-2.6-2.3-2.7-2.4-.1-.1-.6-.8-.6-1.6 0-.7.4-1.1.5-1.3.1-.1.3-.2.5-.2h.3c.1 0 .3 0 .4.3l.5 1.2c0 .1.1.2 0 .3l-.3.4c-.1.1-.2.2-.1.4.2.3.6.9 1.2 1.4.6.5 1.1.7 1.3.8.2.1.3.1.4-.1l.4-.5c.1-.2.3-.1.4-.1l1.1.5c.1.1.2.1.3.2 0 .1 0 .5-.1.9Z"
        fill="#fff"
      />
    </svg>
  )
}
