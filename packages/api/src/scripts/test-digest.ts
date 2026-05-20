import { getStats } from '@/lib/analytics/index'
import { generateDigest } from '@/lib/digest/index'

const stats = await getStats('test-key')
const digest = generateDigest(stats)

console.log('\n--- TODAY\'S PULSE ---')
console.log(`Date: ${digest.date}`)
console.log(`Summary: ${digest.summary}`)
console.log(`Comeback Rate: ${digest.comebackRate}%`)
console.log(`Insight: ${digest.insight}`)
console.log('---------------------\n')