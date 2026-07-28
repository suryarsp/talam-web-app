'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { AnimatedList } from '@/components/ui/animated-list'
import {
  getNotificationsAction,
  getUnreadNotificationCountAction,
  markAllNotificationsReadAction,
} from '@/app/admin/notifications/actions'
import type { NotificationItem } from '@/lib/data/notifications'

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const content = (
    <div className={`w-full rounded-lg px-3 py-2.5 text-left ${item.read ? '' : 'bg-brand-primary/5'}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-fg">{item.title}</span>
        {!item.read && <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-primary" />}
      </div>
      <p className="mt-0.5 text-xs text-muted-warm">{item.body}</p>
      <span className="mt-1 block text-2xs text-muted-warm">{timeAgo(item.createdAt)}</span>
    </div>
  )
  return item.link ? (
    <Link href={item.link} className="block hover:bg-bg">
      {content}
    </Link>
  ) : (
    <div>{content}</div>
  )
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getUnreadNotificationCountAction().then(setUnreadCount)
    const interval = setInterval(() => {
      getUnreadNotificationCountAction().then(setUnreadCount)
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleOpen() {
    const next = !open
    setOpen(next)
    if (next) {
      const state = await getNotificationsAction()
      setItems(state.items)
      if (state.unreadCount > 0) {
        await markAllNotificationsReadAction()
        setUnreadCount(0)
      }
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={handleOpen} className="relative">
        <Bell className="size-[22px] text-[#374151]" strokeWidth={2} />
        {unreadCount > 0 && <div className="absolute -right-1 -top-1 size-2 rounded-full bg-danger" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-[320px] overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-lg">
          <p className="px-2 py-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-warm">Notifications</p>
          {items.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-warm">No notifications yet.</p>
          ) : (
            <AnimatedList delay={150} className="!items-stretch !gap-0.5">
              {items.map((item) => (
                <NotificationRow key={item.id} item={item} />
              ))}
            </AnimatedList>
          )}
        </div>
      )}
    </div>
  )
}
