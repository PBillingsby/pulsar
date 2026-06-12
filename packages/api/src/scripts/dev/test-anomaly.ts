import { checkProjectForAnomalies } from '@/lib/scheduler/anomaly'

const PROJECT_KEY = 'my-app-xgb9f8'

await checkProjectForAnomalies({
  projectKey: PROJECT_KEY,
  email: 'philbillingsby@gmail.com',
  language: 'English',
  plan: 'beta',
})

console.log('done')