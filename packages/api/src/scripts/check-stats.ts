import { getStats } from '@/lib/analytics/index'
import { getRecentSnapshots } from '@/lib/analytics/snapshots'

const stats = await getStats('my-app-xgb9f8')
console.log('totalVisitors:', stats.totalVisitors)
console.log('comebackRate:', stats.comebackRate)
console.log('insufficientData:', stats.insufficientData)

const snaps = await getRecentSnapshots('my-app-xgb9f8')
console.log('Snapshots:', snaps.map(s => ({ week: s.weekStart, rate: s.comebackRate, visitors: s.totalVisitors })))