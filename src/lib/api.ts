import { toast } from 'sonner'
import { authHeaders } from './auth'
import type {
  HazardType,
  DemandScoreMap,
  CityDetail,
  ForecastPoint,
  TokenResponse,
  UserProfile,
  UserWithCities,
  PriceItem,
  WeatherDay,
  CityUpdateResult,
  SimulationPayload,
} from './types'

const BASE = import.meta.env.VITE_API_BASE_URL // includes /api/v1

/** Custom error that preserves the HTTP status code */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const RATE_LIMIT_MSG = 'Too many requests — please wait a moment and try again.'

/** Handles non-ok responses, showing a toast for 429 rate-limit errors */
function handleResponseError(res: Response, detail?: string): never {
  if (res.status === 429) {
    toast.warning(RATE_LIMIT_MSG)
  }
  throw new ApiError(detail || `Request failed: ${res.status}`, res.status)
}

async function get<T>(path: string, auth = false): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: auth ? authHeaders() : {},
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    handleResponseError(res, err.detail)
  }
  return res.json()
}

async function mutate<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = false,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? authHeaders() : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    handleResponseError(res, err.detail)
  }
  return res.json()
}

// ── Map ───────────────────────────────────────────────────────────────────
export function fetchDemandHeatmap(
  hazard?: HazardType,
  severity?: number,
): Promise<DemandScoreMap> {
  const params = new URLSearchParams()
  if (hazard) params.set('hazard_type', hazard)
  if (severity) params.set('severity', String(severity))
  const qs = params.toString()
  return get(`/map/demand-heat${qs ? `?${qs}` : ''}`)
}

// ── Cities ────────────────────────────────────────────────────────────────
export function fetchCityDetail(pcode: string): Promise<CityDetail> {
  return get(`/cities/${pcode}`)
}

export function updateCity(
  pcode: string,
  body: Record<string, unknown>,
): Promise<CityUpdateResult> {
  return mutate('PATCH', `/cities/${pcode}`, body, true)
}

// ── Forecast ──────────────────────────────────────────────────────────────
export function fetchForecast(
  pcode: string,
  hazard?: HazardType,
  severity?: number,
): Promise<ForecastPoint[]> {
  const params = new URLSearchParams()
  if (hazard) params.set('hazard_type', hazard)
  if (severity) params.set('severity', String(severity))
  const qs = params.toString()
  return get(`/forecast/${pcode}${qs ? `?${qs}` : ''}`)
}

// ── Simulate (global heatmap recalc) ──────────────────────────────────────
export function runSimulation(
  payload: SimulationPayload,
): Promise<DemandScoreMap> {
  return mutate('POST', '/simulate', payload)
}

// ── Simulator (custom city — query params, no DB) ─────────────────────────
export function fetchCustomCityForecast(params: {
  population: number
  households?: number
  is_coastal?: number
  poverty_pct?: number
  flood_zone?: string
  eq_zone?: string
  hazard_type?: string
  severity?: number
}): Promise<ForecastPoint[]> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    qs.set(k, String(v))
  }
  return get(`/simulator/forecast?${qs}`)
}

// ── Auth ──────────────────────────────────────────────────────────────────
export function login(email: string, password: string): Promise<TokenResponse> {
  return mutate('POST', '/auth/login', { email, password })
}

export function register(body: {
  email: string
  password: string
  fullName: string
  role?: string
}): Promise<UserProfile> {
  return mutate('POST', '/auth/register', body, true)
}

export function fetchMe(): Promise<UserProfile> {
  return get('/auth/me', true)
}

// ── Admin ─────────────────────────────────────────────────────────────────
export function fetchUsers(): Promise<UserWithCities[]> {
  return get('/admin/users', true)
}

export function assignCities(
  userId: number,
  pcodes: string[],
): Promise<{
  message: string
  added: string[]
  skipped: string[]
  invalid: string[]
}> {
  return mutate('POST', `/admin/users/${userId}/cities`, { pcodes }, true)
}

export function removeCityAccess(
  userId: number,
  pcode: string,
): Promise<{ message: string }> {
  return mutate(
    'DELETE',
    `/admin/users/${userId}/cities/${pcode}`,
    undefined,
    true,
  )
}

// ── Prices ────────────────────────────────────────────────────────────────
export function fetchPrices(): Promise<PriceItem[]> {
  return get('/prices')
}

export function updatePrice(
  itemKey: string,
  pricePerUnit: number,
): Promise<PriceItem> {
  return mutate('PATCH', `/prices/${itemKey}`, { pricePerUnit }, true)
}

// ── Weather ───────────────────────────────────────────────────────────────
export function fetchWeather(): Promise<WeatherDay[]> {
  return get('/weather')
}
