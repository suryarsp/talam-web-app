export type EmailTemplate<P> = (params: P) => { subject: string; html: string }
