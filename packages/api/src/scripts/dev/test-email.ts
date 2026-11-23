import { buildDigest } from '@/lib/digest/index'
import { sendDigest } from '@/lib/email/index'

const digest = await buildDigest('testing-terms-and-pr-9ezqui')

const to: string | undefined = process.env.TEST_EMAIL
if (!to) throw new Error('Set TEST_EMAIL to send a test digest')
await sendDigest(to, digest)
console.log('Email sent. Check your inbox.')