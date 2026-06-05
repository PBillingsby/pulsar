export const THRESHOLDS = {
  retentionRisk: {
    comebackDropPts: 20,   // pts drop week over week to trigger
    minVisitors: 20,       // minimum visitors to avoid noise
  },
  deadClickFriction: {
    minCount: 8,        // lower than rage clicks — dead clicks are quieter signal
    minRatePercent: 4,  // slightly lower threshold too
  },
  positiveTrend: {
    comebackRisePts: 8,    // lower bar — founders like seeing wins
    minVisitors: 10,
  },
  rageclickFriction: {
    minCount: 10,          // minimum rage clicks on a page
    minSessions: 3,        // must span at least 3 sessions (not one angry user)
    minRatePercent: 5,     // rage clicks from >5% of total sessions
  },
  funnelDrop: {
    activationDropPts: 15, // pts drop in activation reach rate
    minSessions: 15,       // minimum sessions for signal to be meaningful
  },
  highIntentNoConvert: {
    minCopyEvents: 5,      // minimum copy events on a page
  },
  hiddenWinner: {
    minReturnMultiplier: 2.5, // returners visit page X at least 2.5x more than bouncers
    minReturnerVisits: 3,     // page must have at least 3 returner visits
  },
} as const