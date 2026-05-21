import { runDailyDigest } from '@/lib/scheduler/index'

console.log('Testing daily digest run...')
await runDailyDigest()
console.log('Done.')