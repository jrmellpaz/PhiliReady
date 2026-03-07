export function getDemandColor(score: number): string {
  if (score > 0.8) return '#D03050' // critical
  if (score > 0.6) return '#D48B0A' // high
  if (score > 0.4) return '#C08B00' // moderate
  if (score > 0.2) return '#2B7DE9' // low
  return '#0EA47A' // minimal
}

export function getRiskLabel(score: number): string {
  if (score > 0.8) return 'CRITICAL'
  if (score > 0.6) return 'HIGH'
  if (score > 0.4) return 'MODERATE'
  if (score > 0.2) return 'LOW'
  return 'MINIMAL'
}
