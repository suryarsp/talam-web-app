'use client'

import { useEffect, useRef } from 'react'
import { Bold, Italic, Underline, List } from 'lucide-react'

/** ponytail: contentEditable + execCommand — no rich-text lib installed, this is the few-lines version. Upgrade to tiptap if we need paste-sanitization or collab editing. */
export function RichTextEditor({ defaultValue, onChange }: { defaultValue: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  // Set initial HTML once on mount only — writing it via dangerouslySetInnerHTML on every
  // render reset the DOM (and caret to position 0) on each keystroke, since the parent
  // re-renders with a new defaultValue after every onChange, making typed text appear reversed.
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = defaultValue
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function exec(command: string) {
    ref.current?.focus()
    document.execCommand(command)
    if (ref.current) onChange(ref.current.innerHTML)
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-1 border-b border-border p-1.5">
        <button type="button" onClick={() => exec('bold')} className="flex size-7 cursor-pointer items-center justify-center rounded text-muted-warm hover:bg-bg hover:text-fg">
          <Bold className="size-4" />
        </button>
        <button type="button" onClick={() => exec('italic')} className="flex size-7 cursor-pointer items-center justify-center rounded text-muted-warm hover:bg-bg hover:text-fg">
          <Italic className="size-4" />
        </button>
        <button type="button" onClick={() => exec('underline')} className="flex size-7 cursor-pointer items-center justify-center rounded text-muted-warm hover:bg-bg hover:text-fg">
          <Underline className="size-4" />
        </button>
        <button type="button" onClick={() => exec('insertUnorderedList')} className="flex size-7 cursor-pointer items-center justify-center rounded text-muted-warm hover:bg-bg hover:text-fg">
          <List className="size-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="min-h-[120px] px-3 py-3 text-md text-fg outline-none [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  )
}
