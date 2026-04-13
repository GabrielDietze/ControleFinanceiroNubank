import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange?.(false)
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
      />
      {children}
    </div>
  )
}

function DialogContent({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        // Base
        'relative z-50 bg-background shadow-lg w-full',
        // Mobile: bottom sheet
        'rounded-t-2xl border-t border-x p-6 pb-8',
        // Desktop: centered modal
        'sm:rounded-xl sm:border sm:mx-4 sm:w-auto sm:min-w-[32rem] sm:max-w-xl sm:pb-6',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Drag handle — visible only on mobile */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-muted-foreground/25 sm:hidden" />
      {children}
    </div>
  )
}

function DialogHeader({ children }: { children?: React.ReactNode }) {
  return <div className="mb-4">{children}</div>
}

function DialogTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-semibold leading-none', className)}
      {...props}
    >
      {children}
    </h2>
  )
}

function DialogFooter({ children }: { children?: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>
}

function DialogClose({
  onClick,
  children,
}: {
  onClick?: () => void
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
    >
      {children ?? <X size={16} />}
    </button>
  )
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose }
