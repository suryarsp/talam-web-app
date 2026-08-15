import { cn } from "@/lib/utils"

interface BlurFadeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  duration?: number
  delay?: number
  offset?: number
  direction?: "up" | "down" | "left" | "right"
  /**
   * Kept for call-site compatibility. The reveal is now a pure CSS animation
   * that runs on first paint, so there is no scroll observer to opt into.
   */
  inView?: boolean
  blur?: string
}

export function BlurFade({
  children,
  className,
  duration = 0.4,
  delay = 0,
  offset = 6,
  direction = "down",
  inView: _inView,
  blur = "6px",
  style,
  ...props
}: BlurFadeProps) {
  const axis = direction === "left" || direction === "right" ? "x" : "y"
  const distance = direction === "right" || direction === "down" ? -offset : offset

  return (
    <div
      className={cn("blur-fade", className)}
      style={
        {
          "--bf-duration": `${duration}s`,
          "--bf-delay": `${0.04 + delay}s`,
          "--bf-blur": blur,
          [`--bf-${axis}`]: `${distance}px`,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  )
}
