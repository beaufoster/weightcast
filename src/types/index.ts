export interface Checkin {
  id: number
  date: string   // YYYY-MM-DD
  weight: number // always stored in lbs internally
  note: string
}

export interface Plan {
  cw: number         // current weight lbs
  gw: number         // goal weight lbs
  sim: SimWeek[]
  cal: number        // calorie target
  exPerDay: number   // exercise calories/day
  goalDate: string   // ISO string
  savedAt: string    // ISO string
  mode: 'weight' | 'date'
  age: number
  htFt: number
  htIn: number
  htCm: number
  sex: 'male' | 'female'
  act: number        // 0–3 index
  walk: number       // minutes/day
  lift: number       // days/week
  cardio: number     // days/week
  pace: Pace
  name?: string
}

export interface SimWeek {
  week: number
  weight: number
}

export interface Profile {
  display_name: string | null
  unit_pref: Unit
}

export type Pace = 'gentle' | 'steady' | 'aggressive'
export type Unit = 'lbs' | 'kg'
export type CalcMode = 'weight' | 'date'
export type Page = 'calculator' | 'checkin'
export type AuthMode = 'signin' | 'signup' | 'forgot'
