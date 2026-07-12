import { Sidebar } from '@/components/layout/Sidebar'
import { PwaTracker } from '@/components/PwaTracker'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] lg:flex">
      <PwaTracker />
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
