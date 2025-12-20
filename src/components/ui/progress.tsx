import * as React from "react"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  className?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, max = 100, className, ...props }, ref) => {
    const percentage = Math.min(Math.max(value, 0), max)
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuenow={percentage}
        aria-valuemax={max}
        className={cn("w-full h-3 rounded-full bg-gray-200 overflow-hidden", className)}
        {...props}
      >
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-[width]"
          style={{ width: `${(percentage / max) * 100}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
