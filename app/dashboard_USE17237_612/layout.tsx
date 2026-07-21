import { Sidebar } from '@/components/layout/Sidebar'
import { PwaTracker } from '@/components/PwaTracker'
import { ProfileGate } from '@/components/ProfileGate'
import { EventBanner } from '@/components/EventBanner'
import { NoticePopups } from '@/components/NoticePopups'
import { DashThemeProvider } from '@/components/dash/DashThemeProvider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashThemeProvider>
      <ProfileGate>
        <div className="min-h-screen bg-[var(--bg)] lg:flex">
          <PwaTracker />
          <EventBanner />
          <Sidebar />
          <main className="min-w-0 flex-1">{children}</main>
          <NoticePopups />
        </div>
      </ProfileGate>
    </DashThemeProvider>
  )
}
