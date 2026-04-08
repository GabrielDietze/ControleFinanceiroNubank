import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/sonner'
import { useTransactionStore } from '@/store/useTransactionStore'
import DashboardPage from '@/pages/Dashboard'
import TransactionsPage from '@/pages/Transactions'
import CategoriesPage from '@/pages/Categories'
import InvestmentsPage from '@/pages/Investments'
import ImportPage from '@/pages/Import'
import SettingsPage from '@/pages/Settings'

function AppInitializer({ children }: { children: React.ReactNode }) {
  const load = useTransactionStore((s) => s.load)

  useEffect(() => {
    load()
  }, [load])

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <AppInitializer>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/investments" element={<InvestmentsPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
        <Toaster richColors position="top-right" />
      </AppInitializer>
    </BrowserRouter>
  )
}

export default App
