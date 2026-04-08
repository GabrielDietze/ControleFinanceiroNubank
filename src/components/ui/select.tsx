import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SelectItemDef {
  value: string
  label: string
  disabled?: boolean
}

interface SelectContextType {
  value?: string
  onValueChange?: (v: string) => void
  items: SelectItemDef[]
  addItem: (i: SelectItemDef) => void
  removeItem: (value: string) => void
}

// ─── Context ───────────────────────────────────────────────────────────────────
// O contexto vive no Select raiz para que SelectTrigger e SelectItem o compartilhem.
// Antes o contexto estava no SelectContent (ramo separado), então o <select> nativo
// nunca recebia os <option>s e o dropdown abria vazio.
const SelectContext = React.createContext<SelectContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
})

// ─── Select (raiz) ─────────────────────────────────────────────────────────────
function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
  disabled?: boolean
}) {
  const [items, setItems] = React.useState<SelectItemDef[]>([])

  const addItem = React.useCallback((item: SelectItemDef) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.value === item.value)
      if (idx !== -1) {
        // Atualiza label se já existe (ex: lista dinâmica)
        const next = [...prev]
        next[idx] = item
        return next
      }
      return [...prev, item]
    })
  }, [])

  const removeItem = React.useCallback((v: string) => {
    setItems((prev) => prev.filter((i) => i.value !== v))
  }, [])

  return (
    <SelectContext.Provider value={{ value, onValueChange, items, addItem, removeItem }}>
      {children}
    </SelectContext.Provider>
  )
}

// ─── SelectTrigger ─────────────────────────────────────────────────────────────
function SelectTrigger({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  const { value, onValueChange, items } = React.useContext(SelectContext)

  return (
    <div
      className={cn(
        'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus-within:outline-none focus-within:ring-1 focus-within:ring-ring relative cursor-pointer overflow-hidden',
        className,
      )}
    >
      <span className="pointer-events-none flex-1 text-left truncate">{children}</span>
      <ChevronDown className="h-4 w-4 opacity-50 pointer-events-none shrink-0" />
      {/* Select nativo invisível — abre o picker nativo do SO ao clicar */}
      <select
        value={value ?? ''}
        onChange={(e) => onValueChange?.(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
      >
        {items.map((item) => (
          <option key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ─── SelectContent ─────────────────────────────────────────────────────────────
// Apenas renderiza os filhos (SelectItem) ocultos para que se registrem no contexto.
function SelectContent({ children }: { children?: React.ReactNode }) {
  return <div style={{ display: 'none' }}>{children}</div>
}

// ─── SelectItem ────────────────────────────────────────────────────────────────
// Registra a opção no contexto ao montar e remove ao desmontar (listas dinâmicas).
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
  const { addItem, removeItem } = React.useContext(SelectContext)
  const label = typeof children === 'string' ? children : value

  React.useEffect(() => {
    addItem({ value, label, disabled })
    return () => removeItem(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, label, disabled])

  return null
}

// ─── SelectValue ───────────────────────────────────────────────────────────────
function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, items } = React.useContext(SelectContext)
  const current = items.find((i) => i.value === value)
  return <>{current ? current.label : (placeholder ?? '')}</>
}

// ─── Stubs ─────────────────────────────────────────────────────────────────────
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
