import { buildDigest } from '@/lib/digest/index'
import { sendDigest } from '@/lib/email/index'

const digest = await buildDigest('testing-terms-and-pr-9ezqui')

await sendDigest('philbillingsby@gmail.com', digest)
console.log('Email sent. Check your inbox.')