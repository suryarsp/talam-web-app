"use client";

import React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const shinyAnimationProps = {
  initial: { "--x": "100%", scale: 0.8 },
  animate: { "--x": "-100%", scale: 1 },
  whileTap: { scale: 0.95 },
  transition: {
    repeat: Infinity,
    repeatType: "loop",
    repeatDelay: 1,
    type: "spring",
    stiffness: 20,
    damping: 15,
    mass: 2,
    scale: { type: "spring", stiffness: 200, damping: 5, mass: 0.5 },
  },
} as const;

interface ShinyButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
  > {
  children: React.ReactNode;
  className?: string;
}

export const ShinyButton = React.forwardRef<HTMLButtonElement, ShinyButtonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        {...shinyAnimationProps}
        {...props}
        className={cn(
          "relative overflow-hidden transition-shadow duration-300 ease-in-out hover:shadow-md disabled:pointer-events-none disabled:opacity-60",
          className
        )}
      >
        <span
          className="relative z-10 block size-full"
          style={{
            maskImage:
              "linear-gradient(-75deg,currentColor calc(var(--x) + 20%),transparent calc(var(--x) + 30%),currentColor calc(var(--x) + 100%))",
          }}
        >
          {children}
        </span>
        <span
          style={{
            mask: "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
            maskComposite: "exclude",
            background:
              "linear-gradient(-75deg,color-mix(in srgb,currentColor 10%,transparent) calc(var(--x) + 20%),color-mix(in srgb,currentColor 50%,transparent) calc(var(--x) + 25%),color-mix(in srgb,currentColor 10%,transparent) calc(var(--x) + 100%))",
          }}
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] p-px"
        />
      </motion.button>
    );
  }
);
ShinyButton.displayName = "ShinyButton";

export default ShinyButton;
