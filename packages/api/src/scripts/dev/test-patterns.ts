import { detectPatterns } from '@/lib/analytics/patterns'
import { captureWeeklySnapshot, getRecentSnapshots } from '@/lib/analytics/snapshots'

const projectKey = 'test-key'

console.log('Capturing snapshot...')
await captureWeeklySnapshot(projectKey)

console.log('Detecting patterns...')
const patterns = await detectPatterns(projectKey)
console.log('\nPatterns:', JSON.stringify(patterns, null, 2))

console.log('\nRecent snapshots:')
const snapshots = await getRecentSnapshots(projectKey)
console.log(JSON.stringify(snapshots, null, 2))