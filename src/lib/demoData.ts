import { Checkin, Plan } from '@/types'

export const DEMO_NAME = 'Alex'

// Anchored to "4 weeks ago" so the chart and pace badge render meaningfully
const SAVED_AT = new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString()

function weeksAgoDate(n: number): string {
  return new Date(Date.now() - n * 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
}

// Average American male: 199 lbs, 5'9", 35 yo, lightly active, goal -25 lbs
export const DEMO_PLAN: Plan = {
  cw: 199,
  gw: 174,
  startWt: 199,
  sim: [
    { week:  1, weight: 197.6 }, { week:  2, weight: 196.2 },
    { week:  3, weight: 194.9 }, { week:  4, weight: 193.6 },
    { week:  5, weight: 192.3 }, { week:  6, weight: 191.1 },
    { week:  7, weight: 189.9 }, { week:  8, weight: 188.7 },
    { week:  9, weight: 187.6 }, { week: 10, weight: 186.5 },
    { week: 11, weight: 185.4 }, { week: 12, weight: 184.3 },
    { week: 13, weight: 183.3 }, { week: 14, weight: 182.3 },
    { week: 15, weight: 181.3 }, { week: 16, weight: 180.4 },
    { week: 17, weight: 179.5 }, { week: 18, weight: 178.6 },
    { week: 19, weight: 177.7 }, { week: 20, weight: 176.9 },
    { week: 21, weight: 176.1 }, { week: 22, weight: 175.3 },
    { week: 23, weight: 174.6 }, { week: 24, weight: 174.0 },
  ],
  cal: 1900,
  exPerDay: 140,
  goalDate: new Date(Date.now() + 20 * 7 * 24 * 3600 * 1000).toISOString(),
  savedAt: SAVED_AT,
  mode: 'weight',
  age: 35,
  htFt: 5, htIn: 9, htCm: 175,
  sex: 'male',
  act: 2,
  walk: 30, lift: 1, cardio: 0,
  pace: 'steady',
}

export const DEMO_CHECKINS: Checkin[] = [
  { id: -1, date: weeksAgoDate(4), weight: 199.0, note: '' },
  { id: -2, date: weeksAgoDate(3), weight: 197.6, note: '' },
  { id: -3, date: weeksAgoDate(2), weight: 196.1, note: 'Staying consistent.' },
  { id: -4, date: weeksAgoDate(1), weight: 194.7, note: '' },
]
