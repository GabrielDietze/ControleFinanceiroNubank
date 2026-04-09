import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, Bell } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'

export type Insight = { kind: 'warn' | 'good' | 'info'; msg: string }

interface Props {
  insights: Insight[]
}

const ICON_MAP = {
  warn: (
    <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
  ),
  good: (
    <CheckCircle2 size={13} className="text-green-600 shrink-0 mt-0.5" />
  ),
  info: (
    <Info size={13} className="text-blue-600 shrink-0 mt-0.5" />
  ),
}

const STYLE_MAP = {
  warn: 'bg-amber-50 border-amber-200 text-amber-800',
  good: 'bg-green-50 border-green-200 text-green-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

export function InsightDrawer({ insights }: Props) {
  const [open, setOpen] = useState(false)

  if (insights.length === 0) return null

  const warns = insights.filter((i) => i.kind === 'warn').length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          warns > 0
            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
            : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
        }`}
      >
        <Bell size={12} />
        {warns > 0
          ? `${warns} alerta${warns > 1 ? 's' : ''}`
          : `${insights.length} insight${insights.length > 1 ? 's' : ''}`}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogClose onClick={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Insights do Mês</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${STYLE_MAP[ins.kind]}`}
              >
                {ICON_MAP[ins.kind]}
                <span>{ins.msg}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
