import { getStats } from '@/lib/analytics/index'
import { detectPatterns } from '@/lib/analytics/patterns'
import { getRecentSnapshots, captureWeeklySnapshot } from '@/lib/analytics/snapshots'
import { generateLLMInsight } from '@/lib/digest/insight'
import type { DigestContext, PulsarStats, WeeklySnapshot, BehavioralPatterns } from '@/types/index'

const projectKey: string = 'my-app-xgb9f8'

await captureWeeklySnapshot(projectKey)

const [current, snapshots, patterns]: [PulsarStats, WeeklySnapshot[], BehavioralPatterns] = await Promise.all([
  getStats(projectKey),
  getRecentSnapshots(projectKey),
  detectPatterns(projectKey),
])

console.log('Current comeback rate:', current.comebackRate)
console.log('Snapshots:', snapshots.map(s => ({ week: s.weekStart, rate: s.comebackRate })))
console.log('Insufficient data:', current.insufficientData)

const ctx: DigestContext = { current, snapshots, patterns }
const insight: string = await generateLLMInsight(ctx)
console.log('\nInsight:', insight)