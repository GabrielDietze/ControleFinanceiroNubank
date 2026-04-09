import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  List,
  PieChart,
  TrendingUp,
  Upload,
  Settings,
  FileBarChart2,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transações', icon: List },
  { to: '/categories', label: 'Categorias', icon: PieChart },
  { to: '/investments', label: 'Investimentos', icon: TrendingUp },
  { to: '/reports', label: 'Relatórios', icon: FileBarChart2 },
  { to: '/import', label: 'Importar', icon: Upload },
  { to: '/settings', label: 'Configurações', icon: Settings },
]

export function AppLayout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#820AD1] flex items-center justify-center">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <span className="font-semibold text-sm">Nubank Finance</span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t">
          <p className="text-xs text-muted-foreground">Dados locais · sem servidor</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
