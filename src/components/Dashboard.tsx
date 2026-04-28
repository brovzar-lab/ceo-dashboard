import { useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useInboxStore } from '@/stores/useInboxStore'
import { useCalendarStore } from '@/stores/useCalendarStore'
import { useBrainStore } from '@/stores/useBrainStore'
import { useSparkStore } from '@/stores/useSparkStore'
import { useBriefStore } from '@/stores/useBriefStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useDecisionStore } from '@/stores/useDecisionStore'
import { Header } from './Header'
import { DemoBanner } from './DemoBanner'
import { BriefPanel } from './BriefPanel'
import { NextUpBar } from './NextUpBar'
import { TasksPanel } from './TasksPanel'
import { InboxPanel } from './InboxPanel'
import { BrainPanel } from './BrainPanel'
import { SparkCard } from './SparkCard'
import { DecisionJournal } from './DecisionJournal'
import { SkillLauncher } from './SkillLauncher'
import { BillyDrawer } from './BillyDrawer'
import { MeetingPrepModal } from './MeetingPrepModal'
import { SkillModal } from './SkillModal'

export function Dashboard() {
  const { user, isAuthenticated } = useAuthStore()
  const { refresh: refreshBrief } = useBriefStore()
  const fetchInbox = useInboxStore((s) => s.fetch)
  const fetchCalendar = useCalendarStore((s) => s.fetch)
  const fetchBrain = useBrainStore((s) => s.fetch)
  const fetchSpark = useSparkStore((s) => s.fetch)
  const subscribeToTasks = useTaskStore((s) => s.subscribe)
  const subscribeToDecisions = useDecisionStore((s) => s.subscribe)

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const unsubTasks = subscribeToTasks(user.uid)
    const unsubDecisions = subscribeToDecisions(user.uid)
    const stopBrief = refreshBrief()

    fetchInbox()
    fetchCalendar()
    fetchBrain()
    fetchSpark()

    return () => {
      unsubTasks()
      unsubDecisions()
      stopBrief()
    }
  }, [isAuthenticated, user?.uid])

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-body">
      <DemoBanner />
      <Header />
      <main className="max-w-[1440px] mx-auto px-4 pb-16">
        <BriefPanel />
        <NextUpBar />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <TasksPanel />
          <InboxPanel />
          <BrainPanel />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <SparkCard />
          <DecisionJournal />
        </div>
      </main>
      <SkillLauncher />
      <BillyDrawer />
      <MeetingPrepModal />
      <SkillModal />
    </div>
  )
}
