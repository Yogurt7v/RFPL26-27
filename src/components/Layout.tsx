import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { PerfPanel } from './PerfPanel'
import { useAutoSync } from '../hooks/useAutoSync'

export function Layout() {
  useAutoSync()

  return (
    <div className="layout">
      <Header />
      <main className="layout__content">
        <Outlet />
      </main>
      <BottomNav />
      {import.meta.env.DEV && <PerfPanel />}
    </div>
  )
}
