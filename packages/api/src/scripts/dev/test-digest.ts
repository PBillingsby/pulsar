import { buildDigest } from '@/lib/digest/index'

const digest = await buildDigest('dropframe-qdkuz0')

console.log('\n--- TODAY\'S PULSE ---')
console.log(`Date: ${digest.date}`)
console.log(`Summary: ${digest.summary}`)
console.log(`Comeback Rate: ${digest.comebackRate}%`)
console.log(`Insight: ${digest.insight}`)
console.log('---------------------\n')