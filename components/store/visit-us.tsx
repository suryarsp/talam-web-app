import Link from 'next/link'

export type BranchDisplay = {
  id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  mapsUrl: string | null
}

type Props = { branches: BranchDisplay[] }

export function VisitUs({ branches }: Props) {
  if (branches.length === 0) return null

  return (
    <section className="space-y-5">
      <h2 className="font-body text-lg font-bold text-fg">Visit Us</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {branches.map((branch) => (
          <div key={branch.id} className="rounded-lg border border-border p-6">
            <p className="mb-1.5 font-body text-base font-bold text-fg">{branch.name}</p>
            {(branch.address || branch.city) && (
              <p className="mb-3.5 font-body text-sm leading-[150%] whitespace-pre-line text-muted-warm">
                {[branch.address, branch.city].filter(Boolean).join('\n')}
              </p>
            )}
            {branch.phone && <p className="mb-4 font-body text-sm text-muted-warm">{branch.phone}</p>}
            {branch.mapsUrl && (
              <Link
                href={branch.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 items-center justify-center rounded-sm border border-border font-body text-sm font-medium text-fg"
              >
                View on Maps →
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
