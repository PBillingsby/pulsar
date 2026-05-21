import type { DigestData, PulsarStats } from '@/types/index'

function getTopPage(url: string): string {
  try {
    const parsed: string | URL = new URL(url)
    return parsed.pathname === '/' ? 'homepage' : parsed.pathname
  } catch {
    return url
  }
}

function getComebackContext(rate: number): string {
  if (rate === 0) return "No users have returned yet. That's normal early on — focus on getting more first-time visitors."
  if (rate < 10) return "A small number of users are returning. Consider what brought them back and double down on it."
  if (rate < 25) return "Some users are finding enough value to return. That's a positive early signal."
  if (rate < 50) return "Nearly a quarter of your users are coming back. Something is working — figure out what and amplify it."
  return "Strong return rate. Users are finding consistent value in your product."
}

function getTopPageInsight(topPage: string, totalPageViews: number): string {
  if (topPage === 'homepage') return `Most activity is on your homepage. Users may not be discovering your core features yet.`
  if (topPage.includes('pricing')) return `Pricing is your most visited page. Users are evaluating cost — make sure the value is clear.`
  if (topPage.includes('onboarding')) return `Onboarding is getting the most traffic. Focus on making that first experience count.`
  if (topPage.includes('dashboard')) return `Users are spending time in your dashboard. That's a strong activation signal.`
  return `Most activity is on ${topPage}. Watch whether this aligns with your core value proposition.`
}

export function generateDigest(stats: PulsarStats): DigestData {
  const returning: number = stats.recentSessions.filter((s) => s.returned).length
  const topPage: string = stats.topPages[0]?.url ?? ''
  const topPagePath: string = topPage ? getTopPage(topPage) : ''

  const lines: string[] = []

  if (stats.totalVisitors === 0) {
    lines.push('No visitors yet.')
  } else {
    lines.push(`${stats.totalVisitors} ${stats.totalVisitors === 1 ? 'visitor' : 'visitors'} in the last 7 days.`)
    if (returning > 0) {
      lines.push(`${returning} came back.`)
    } else {
      lines.push('No one has returned yet.')
    }
    if (topPagePath) {
      lines.push(`Most visited: ${topPagePath}.`)
    }
  }

  const summary: string = lines.join(' ')

  let insight: string
  if (stats.insufficientData) {
    insight = 'Keep driving traffic. Comeback rate will appear once you have at least 10 unique visitors.'
  } else if (stats.comebackRate !== null) {
    insight = getComebackContext(stats.comebackRate)
  } else if (topPagePath) {
    insight = getTopPageInsight(topPagePath, stats.totalPageViews)
  } else {
    insight = 'Install Pulsar on your product and start driving traffic to see your first insights.'
  }

  return {
    projectKey: stats.projectKey,
    date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    summary,
    comebackRate: stats.comebackRate,
    totalVisitors: stats.totalVisitors,
    topPage: topPagePath,
    returning,
    insight,
  }
}