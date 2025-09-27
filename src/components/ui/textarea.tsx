import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "flex w-full text-base placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default: [
          "min-h-[60px] rounded-[3px] border border-input bg-transparent px-3 py-2 shadow-sm",
          "focus-visible:ring-1 focus-visible:ring-ring"
        ],
        ghost: [
          "bg-transparent border-0 shadow-none px-0 py-0",
          "focus-visible:ring-0 focus-visible:ring-offset-0"
        ],
        chat: [
          "min-h-[48px] rounded-xl border border-input bg-background px-3 py-2 shadow-sm",
          "resize-none field-sizing-content max-h-[6lh]",
          "focus-visible:ring-1 focus-visible:ring-ring"
        ]
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
