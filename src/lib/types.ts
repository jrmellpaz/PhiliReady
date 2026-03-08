import { z } from 'zod'

// ── Hazard types ──────────────────────────────────────────────────────────
export type HazardType = 'typhoon' | 'flood' | 'earthquake' | 'volcanic'

// ── Map Heatmap ───────────────────────────────────────────────────────────
// GET /map/demand-heat → { "1380600000": 0.92, ... }
export const DemandScoreMapSchema = z.record(z.string(), z.number())
export type DemandScoreMap = z.infer<typeof DemandScoreMapSchema>

// ── Forecast ──────────────────────────────────────────────────────────────
// GET /forecast/{pcode} → ForecastPoint[]
export const ForecastPointSchema = z.object({
  day: z.string(),
  rice: z.number(),
  riceLower: z.number(),
  riceUpper: z.number(),
  riceCost: z.number(),
  water: z.number(),
  waterLower: z.number(),
  waterUpper: z.number(),
  waterCost: z.number(),
  meds: z.number(),
  medsLower: z.number(),
  medsUpper: z.number(),
  medsCost: z.number(),
  kits: z.number(),
  kitsLower: z.number(),
  kitsUpper: z.number(),
  kitsCost: z.number(),
  totalCost: z.number(),
})
export type ForecastPoint = z.infer<typeof ForecastPointSchema>

// ── City Detail ───────────────────────────────────────────────────────────
// GET /cities/{pcode} → CityDetail
export const CityDemandSchema = z.object({
  rice: z.number(),
  water: z.number(),
  meds: z.number(),
  kits: z.number(),
})

export const CityDetailSchema = z.object({
  pcode: z.string(),
  name: z.string(),
  province: z.string(),
  region: z.string(),
  population: z.number(),
  households: z.number(),
  povertyPct: z.number(),
  isCoastal: z.number(),
  floodZone: z.string(),
  eqZone: z.string(),
  riskScore: z.number(),
  zoneType: z.string(),
  demand: CityDemandSchema,
  updatedBy: z.string().nullable(),
  updatedAt: z.string().nullable(),
})
export type CityDetail = z.infer<typeof CityDetailSchema>

// ── Auth ──────────────────────────────────────────────────────────────────
// POST /auth/login → TokenResponse
export const TokenResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string(),
})
export type TokenResponse = z.infer<typeof TokenResponseSchema>

// GET /auth/me → UserProfile
export const UserProfileSchema = z.object({
  id: z.number(),
  email: z.string(),
  fullName: z.string(),
  role: z.string(),
})
export type UserProfile = z.infer<typeof UserProfileSchema>

// ── Admin ─────────────────────────────────────────────────────────────────
// GET /admin/users → UserWithCities[]
export const UserWithCitiesSchema = z.object({
  id: z.number(),
  email: z.string(),
  fullName: z.string(),
  role: z.string(),
  cities: z.array(z.string()),
})
export type UserWithCities = z.infer<typeof UserWithCitiesSchema>

// ── Prices ────────────────────────────────────────────────────────────────
// GET /prices → PriceItem[]
export const PriceItemSchema = z.object({
  itemKey: z.string(),
  label: z.string(),
  unit: z.string(),
  pricePerUnit: z.number(),
  updatedAt: z.string(),
})
export type PriceItem = z.infer<typeof PriceItemSchema>

// ── Weather ───────────────────────────────────────────────────────────────
// GET /weather → WeatherDay[]
export const WeatherDaySchema = z.object({
  date: z.string(),
  precipMm: z.number(),
  windKmh: z.number(),
  alert: z.boolean(),
})
export type WeatherDay = z.infer<typeof WeatherDaySchema>

// ── City Update ───────────────────────────────────────────────────────────
// PATCH /cities/{pcode} → CityUpdateResult
export const CityUpdateResultSchema = CityDetailSchema.omit({ demand: true }).extend({
  message: z.string(),
})
export type CityUpdateResult = z.infer<typeof CityUpdateResultSchema>

// ── Simulation Request ────────────────────────────────────────────────────
// POST /simulate body
export interface SimulationPayload {
  hazardType: HazardType
  severity: number
}
