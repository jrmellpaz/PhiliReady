/**
 * ai-explain.ts
 * Type definitions for the AI assessment feature.
 *
 * All API calls and caching have moved to the backend:
 *   POST /api/v1/explain  — streaming endpoint (DB-cached)
 */

export interface ExplainInput {
  /** PSGC code — used as the DB cache key server-side. */
  pcode?: string

  /* City identity */
  cityName: string
  province?: string
  region?: string

  /* Demographics */
  population: number
  households: number
  povertyPct?: number   // 0-1
  isCoastal?: boolean
  floodZone?: string
  eqZone?: string

  /* Risk */
  riskScore?: number    // 0-1

  /* Peak demand */
  demand: {
    rice: number        // kg
    water: number       // L
    meds: number        // units
    kits: number        // units
  }

  /* Costs */
  totalWeekCost: number
  forecastDays?: Array<{ day: string; totalCost: number }>

  /* Simulation context */
  simActive?: boolean
  hazard?: string
  severity?: number     // 1-4

  /**
   * When true, the backend skips the cache and regenerates fresh.
   * Set by the Regenerate button in AiAssessment.
   */
  force?: boolean
}

/** Shape of a completed assessment (used by ExportButton). */
export interface ExplainResult {
  text: string
  generatedAt: string   // ISO 8601
}