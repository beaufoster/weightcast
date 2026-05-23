interface Point { x: number; y: number }

export function linearRegression(pts: Point[]): { slope: number; intercept: number } | null {
  const n = pts.length
  if (n < 2) return null
  const sumX  = pts.reduce((a, p) => a + p.x, 0)
  const sumY  = pts.reduce((a, p) => a + p.y, 0)
  const sumXY = pts.reduce((a, p) => a + p.x * p.y, 0)
  const sumX2 = pts.reduce((a, p) => a + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}
