import { getStats } from '@/lib/analytics/index'
import { generateDigest } from '@/lib/digest/index'
import { sendDigest } from '@/lib/email/index'

const stats = await getStats('test-key')
const digest = generateDigest(stats)

await sendDigest('philbillingsby@gmail.com', digest)
console.log('Email sent. Check your inbox.')