'use client'

import { useEffect, useState } from 'react'
import { History, Package, PartyPopper, Store } from 'lucide-react'
import { EmptyState } from '@/components/admin/empty-state'
import { getPublishLogsAction } from './actions'
import type { PublishLogEntry, PublishLogItem } from '@/lib/data/publish-logs'

function formatPublishedAt(date: Date) {
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const FILTERS = ['All', 'This Week', 'This Month', 'Last 3 Months'] as const
type Filter = (typeof FILTERS)[number]

function cutoffFor(filter: Filter): Date | null {
  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000
  if (filter === 'This Week') return new Date(now - 7 * DAY)
  if (filter === 'This Month') return new Date(now - 30 * DAY)
  if (filter === 'Last 3 Months') return new Date(now - 90 * DAY)
  return null
}

function iconForItems(items: PublishLogItem[]) {
  const firstType = items[0]?.type
  if (firstType === 'product') return Package
  if (firstType === 'occasion') return PartyPopper
  if (firstType === 'store_info') return Store
  return History
}

function itemLabel(item: PublishLogItem) {
  if (item.type === 'store_info') return 'Store info'
  return `${item.name} (${item.type})`
}

export default function AdminVersionsPage() {
  const [logs, setLogs] = useState<PublishLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    getPublishLogsAction()
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [])

  const cutoff = cutoffFor(activeFilter)
  const filteredLogs = cutoff ? logs.filter((log) => log.publishedAt >= cutoff) : logs

  return (
    <div className="px-4 pb-24 md:px-0 md:pb-0">
      <div className="pb-5 pt-1 md:pt-0">
        <p className="text-2xs font-medium uppercase tracking-[0.06em] text-muted-warm">Publish History</p>
        <h1 className="font-marketing mt-0.5 text-[24px] font-semibold leading-tight text-fg md:text-[28px]">Versions</h1>
        <p className="mt-1 text-sm text-muted-warm">Every publish is saved here — what changed, and when.</p>
      </div>

      <div className="mb-5 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`shrink-0 cursor-pointer rounded-full px-3 py-[5px] text-2xs font-semibold transition-colors ${
              filter === activeFilter ? 'bg-fg text-surface' : 'text-muted-warm hover:text-fg'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {!loading && filteredLogs.length === 0 ? (
        <EmptyState icon={History} message={logs.length === 0 ? 'No versions published yet.' : 'No publishes in this range.'} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg bg-surface md:block">
            <div className="grid grid-cols-[20px_1fr_2fr_auto] items-center gap-x-4 border-b border-border px-4 pb-2 pt-3 text-xs font-bold uppercase tracking-[0.06em] text-muted-warm">
              <span />
              <span>Published</span>
              <span>What changed</span>
              <span>Items</span>
            </div>
            {filteredLogs.map((log, i) => {
              const Icon = iconForItems(log.items)
              const expanded = expandedId === log.id
              return (
                <div key={log.id} className={i > 0 ? 'border-t border-border-light' : ''}>
                  <button
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                    className="grid w-full cursor-pointer grid-cols-[20px_1fr_2fr_auto] items-center gap-x-4 px-4 py-3 text-left text-sm transition-colors hover:bg-bg"
                  >
                    <Icon className="size-4 shrink-0 text-muted-warm" strokeWidth={2} />
                    <span className="text-fg">{formatPublishedAt(log.publishedAt)}</span>
                    <span className="text-fg">{log.summary}</span>
                    <span className="text-muted-warm">{log.itemCount}</span>
                  </button>
                  {expanded && log.items.length > 0 ? (
                    <ul className="flex flex-col gap-1 px-4 pb-3 pl-11 text-xs text-muted-warm">
                      {log.items.map((item, idx) => (
                        <li key={idx}>• {itemLabel(item)}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 md:hidden">
            {filteredLogs.map((log) => {
              const Icon = iconForItems(log.items)
              const expanded = expandedId === log.id
              return (
                <div key={log.id} className="rounded-lg border border-border-light bg-surface p-3">
                  <button
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                    className="flex w-full cursor-pointer items-start gap-3 text-left"
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-warm" strokeWidth={2} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-fg">{log.summary}</p>
                      <p className="mt-1 text-xs text-muted-warm">
                        {formatPublishedAt(log.publishedAt)} · {log.itemCount} item{log.itemCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </button>
                  {expanded && log.items.length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-1 pl-7 text-xs text-muted-warm">
                      {log.items.map((item, idx) => (
                        <li key={idx}>• {itemLabel(item)}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
