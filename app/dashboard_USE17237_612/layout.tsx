import { Sidebar } from '@/components/layout/Sidebar'
import { PwaTracker } from '@/components/PwaTracker'
import { ProfileGate } from '@/components/ProfileGate'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] lg:flex">
      <PwaTracker />
      <ProfileGate />
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
