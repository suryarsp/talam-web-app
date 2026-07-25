import { requireOwnerTenant } from '@/lib/admin-guard'
import { listPublishLogs } from '@/lib/data/publish-logs'

function formatPublishedAt(date: Date) {
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default async function AdminVersionsPage() {
  const { tenantId } = await requireOwnerTenant()
  const logs = await listPublishLogs(tenantId)

  return (
    <div className="px-4 pb-8 md:px-0">
      <div className="pb-5 pt-1 md:pt-0">
        <h1 className="font-marketing text-[24px] font-semibold leading-tight text-fg md:text-[28px]">Versions</h1>
        <p className="mt-1 text-sm text-muted-warm">Every publish is saved here — what changed, and when.</p>
      </div>

      {logs.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-warm">No versions published yet.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg bg-surface sm:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-bold uppercase tracking-[0.06em] text-muted-warm">
                  <th className="px-4 pb-2 pt-3">Published</th>
                  <th className="px-4 pb-2 pt-3">What changed</th>
                  <th className="px-4 pb-2 pt-3">Items</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border-light last:border-0">
                    <td className="px-4 py-3 text-fg">{formatPublishedAt(log.publishedAt)}</td>
                    <td className="px-4 py-3 text-fg">{log.summary}</td>
                    <td className="px-4 py-3 text-muted-warm">{log.itemCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {logs.map((log) => (
              <div key={log.id} className="rounded-lg border border-border-light bg-surface p-3">
                <p className="text-sm font-semibold text-fg">{log.summary}</p>
                <p className="mt-1 text-xs text-muted-warm">{formatPublishedAt(log.publishedAt)} · {log.itemCount} item{log.itemCount === 1 ? '' : 's'}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
