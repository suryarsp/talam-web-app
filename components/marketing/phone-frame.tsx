'use client'

import { cn } from '@/lib/utils'

interface PhoneFrameProps {
  children: React.ReactNode
  className?: string
}

export function PhoneFrame({ children, className }: PhoneFrameProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Android-style frame */}
      <div className="relative rounded-[2.5rem] bg-[#1a1a1a] p-[10px] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_40px_80px_-20px_rgba(0,0,0,0.5)]">
        {/* Camera notch */}
        <div className="absolute top-[18px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          <div className="w-[10px] h-[10px] rounded-full bg-[#2a2a2a] ring-1 ring-[#333]">
            <div className="w-[5px] h-[5px] rounded-full bg-[#404040] m-auto mt-[2.5px]" />
          </div>
        </div>
        {/* Screen */}
        <div className="relative rounded-[2rem] overflow-hidden bg-white">
          {children}
        </div>
      </div>
    </div>
  )
}
