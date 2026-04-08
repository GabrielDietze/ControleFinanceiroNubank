import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// Custom native-select implementation that mirrors the shadcn Select API
// used in this project, without depending on @base-ui/react.

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
  disabled?: boolean
}

interface SelectContextType {
  value?: string
  onValueChange?: (v: string) => void
}

const SelectContext = React.createContext<SelectContextType>({})

interface SelectItemDef {
  value: string
  label: string
  disabled?: boolean
}

const SelectContentContext = React.createContext<{
  items: SelectItemDef[]
  addItem: (i: SelectItemDef) => void
}>({ items: [], addItem: () => {} })

function Select({ value, onValueChange, children }: SelectProps) {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      {children}
    </SelectContext.Provider>
  )
}

function SelectTrigger({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  const ctx = React.useContext(SelectContext)
  const contentCtx = React.useContext(SelectContentContext)

  return (
    <div
      className={cn(
        'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus-within:outline-none focus-within:ring-1 focus-within:ring-ring relative cursor-pointer overflow-hidden',
        className,
      )}
    >
      <span className="pointer-events-none flex-1 text-left truncate">{children}</span>
      <ChevronDown className="h-4 w-4 opacity-50 pointer-events-none shrink-0" />
      <select
        value={ctx.value ?? ''}
        onChange={(e) => ctx.onValueChange?.(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
      >
        {contentCtx.items.map((item) => (
          <option key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function SelectContent({ children }: { children?: React.ReactNode }) {
  const [items, setItems] = React.useState<SelectItemDef[]>([])

  const addItem = React.useCallback((item: SelectItemDef) => {
    setItems((prev) => {
      if (prev.find((i) => i.value === item.value)) return prev
      return [...prev, item]
    })
  }, [])

  return (
    <SelectContentContext.Provider value={{ items, addItem }}>
      <div style={{ display: 'none' }}>{children}</div>
    </SelectContentContext.Provider>
  )
}

function SelectItem({
  value,
  children,
  disabled,
}: {
  value: string
  children?: React.ReactNode
  disabled?: boolean
  className?: string
}) {
  const ctx = React.useContext(SelectContentContext)
  const label = typeof children === 'string' ? children : value

  // Use a ref to avoid re-running on every render
  const added = React.useRef(false)
  React.useEffect(() => {
    if (!added.current) {
      ctx.addItem({ value, label, disabled })
      added.current = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(SelectContext)
  const contentCtx = React.useContext(SelectContentContext)
  const current = contentCtx.items.find((i) => i.value === ctx.value)
  return <>{current ? current.label : (placeholder ?? '')}</>
}

function SelectGroup({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function SelectLabel({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function SelectSeparator() {
  return null
}

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
}
