import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// ─── Context ──────────────────────────────────────────────────────────────────
interface TabsCtx {
  value: string
  onValueChange: (v: string) => void
}
const TabsContext = React.createContext<TabsCtx>({ value: '', onValueChange: () => {} })

// ─── Root ──────────────────────────────────────────────────────────────────────
interface TabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  className?: string
  children?: React.ReactNode
  orientation?: 'horizontal' | 'vertical'
}

function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
}: TabsProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? '')
  const value = controlledValue !== undefined ? controlledValue : uncontrolled
  const setValue = (v: string) => {
    if (controlledValue === undefined) setUncontrolled(v)
    onValueChange?.(v)
  }
  return (
    <TabsContext.Provider value={{ value, onValueChange: setValue }}>
      <div className={cn('flex flex-col gap-2', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

// ─── List ──────────────────────────────────────────────────────────────────────
const tabsListVariants = cva(
  'inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground h-8',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        line: 'gap-1 bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function TabsList({
  className,
  variant = 'default',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof tabsListVariants>) {
  return (
    <div
      role="tablist"
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ─── Trigger ───────────────────────────────────────────────────────────────────
interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

function TabsTrigger({ className, value, children, ...props }: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext)
  const isActive = ctx.value === value
  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        'relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-0.5 text-sm font-medium whitespace-nowrap transition-all',
        'text-foreground/60 hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : '',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ─── Content / Panel ───────────────────────────────────────────────────────────
interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

function TabsContent({ className, value, children, ...props }: TabsContentProps) {
  const ctx = React.useContext(TabsContext)
  if (ctx.value !== value) return null
  return (
    <div
      role="tabpanel"
      className={cn('flex-1 text-sm outline-none', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
