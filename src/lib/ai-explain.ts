/**
 * ai-explain.ts
 * Generates a disaster-preparedness narrative via the Groq API (free tier).
 *
 * Set VITE_LLM_API_KEY in your .env file.
 * Sign up at https://console.groq.com — free, no credit card needed.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

/* ── Types ──────────────────────────────────────────────────────── */

export interface ExplainInput {
  /* City / hypothetical city identity */
  cityName: string
  province?: string
  region?: string

  /* Demographics */
  population: number
  households: number
  povertyPct?: number  // 0-1
  isCoastal?: boolean
  floodZone?: string
  eqZone?: string

  /* Risk */
  riskScore?: number   // 0-1

  /* Peak demand */
  demand: {
    rice: number   // kg
    water: number  // L
    meds: number   // units
    kits: number   // units
  }

  /* Costs */
  totalWeekCost: number
  forecastDays?: Array<{ day: string; totalCost: number }>

  /* Simulation context (optional) */
  simActive?: boolean
  hazard?: string
  severity?: number    // 1-4
}

export interface ExplainResult {
  text: string
  /** ISO timestamp of generation */
  generatedAt: string
}

/* ── Persistent cache (localStorage + in-memory) ────────────────── */
// In-memory layer for fast same-session access.
// localStorage layer so assessments survive page refreshes.
//
// Storage key format:  philiready:ai:<cacheKey>
// We store a lightweight index under "philiready:ai:__index" so we can
// evict the oldest entries when storage is near full (max MAX_ENTRIES).

const LS_PREFIX   = 'philiready:ai:'
const LS_INDEX    = 'philiready:ai:__index'
const MAX_ENTRIES = 100  // cities × scenarios before LRU eviction

const _mem = new Map<string, ExplainResult>()

function cacheKey(input: ExplainInput): string {
  return [
    input.cityName,
    input.province ?? '',
    input.hazard ?? 'none',
    String(input.severity ?? 0),
    // Include the riskScore bucket so a data edit triggers a fresh call
    String(Math.round((input.riskScore ?? 0) * 100)),
    String(Math.round(input.population / 1000)), // bucket by ~1 k
  ].join('|')
}

function lsKey(key: string): string {
  return LS_PREFIX + key
}

/** Read the LRU index (ordered oldest → newest). */
function readIndex(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_INDEX) ?? '[]') as string[]
  } catch {
    return []
  }
}

/** Persist the LRU index. */
function writeIndex(index: string[]): void {
  try {
    localStorage.setItem(LS_INDEX, JSON.stringify(index))
  } catch { /* storage unavailable */ }
}

/** Write one result to localStorage, evicting oldest if over limit. */
function lsWrite(key: string, result: ExplainResult): void {
  try {
    const index = readIndex().filter(k => k !== key) // remove if already present
    index.push(key)  // push to end (newest)

    // Evict oldest entries if over limit
    while (index.length > MAX_ENTRIES) {
      const oldest = index.shift()!
      localStorage.removeItem(lsKey(oldest))
    }

    localStorage.setItem(lsKey(key), JSON.stringify(result))
    writeIndex(index)
  } catch { /* quota exceeded or unavailable — fail silently */ }
}

/** Read one result from localStorage (null if missing/corrupt). */
function lsRead(key: string): ExplainResult | null {
  try {
    const raw = localStorage.getItem(lsKey(key))
    return raw ? (JSON.parse(raw) as ExplainResult) : null
  } catch {
    return null
  }
}

/** Remove one result from localStorage and the index. */
function lsDelete(key: string): void {
  try {
    localStorage.removeItem(lsKey(key))
    writeIndex(readIndex().filter(k => k !== key))
  } catch { /* storage unavailable */ }
}

/** Expose cache for components that want to check without calling the API. */
export function getCachedExplanation(input: ExplainInput): ExplainResult | null {
  const key = cacheKey(input)
  // Check in-memory first, then fall back to localStorage
  return _mem.get(key) ?? lsRead(key) ?? null
}

/** Manually invalidate a cache entry (e.g. after city parameters are edited). */
export function clearCachedExplanation(input: ExplainInput): void {
  const key = cacheKey(input)
  _mem.delete(key)
  lsDelete(key)
}

/* ── Prompt builder ─────────────────────────────────────────────── */

function buildPrompt(input: ExplainInput): string {
  const severityLabel = ['', 'Minor', 'Moderate', 'Major', 'Catastrophic']

  const riskPct = input.riskScore != null
    ? `${(input.riskScore * 100).toFixed(0)}%`
    : 'N/A'

  const povertyPct = input.povertyPct != null
    ? `${(input.povertyPct * 100).toFixed(1)}%`
    : 'N/A'

  const weekCost = `PHP ${input.totalWeekCost
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`

  const location = [input.cityName, input.province, input.region]
    .filter(Boolean)
    .join(', ')

  const simLine = input.simActive
    ? `Active Scenario: ${input.hazard ?? 'Unknown'} - Severity ${input.severity}/4 (${severityLabel[input.severity ?? 0] ?? ''})`
    : 'Baseline (no active scenario)'

  return `You are a senior disaster-preparedness analyst for the Philippine government. Write a professional assessment report section (4 short paragraphs, 280 words max total) based ONLY on the data provided below.

Rules:
- Plain text ONLY. No markdown, no bullet points, no headers, no numbered lists.
- Use only basic ASCII characters. No smart quotes, no em dashes, no curly apostrophes.
- Use straight single quotes (') and hyphens (-) instead of dashes.
- Separate paragraphs with a single blank line.
- NEVER invent or cite specific quantities, figures, or numbers that are not explicitly given in the data below. If you want to reference demand, use the figures provided exactly as given.
- NEVER name specific government agencies, NGOs, or organizations (e.g. do not mention DPWH, Philippine Red Cross, DSWD, NDRRMC, or any other named body). Use general terms like "local authorities", "relief coordinators", or "logistics teams" instead.
- NEVER fabricate details about infrastructure (warehouses, water treatment plants, roads) that are not stated in the data.
- Stick to planning-level guidance. Do not write as if issuing operational orders.

=== LOCATION ===
${location}
Population: ${input.population.toLocaleString('en-US')}  |  Households: ${input.households.toLocaleString('en-US')}
Poverty rate: ${povertyPct}  |  Coastal: ${input.isCoastal ? 'Yes' : 'No'}
Flood Zone: ${input.floodZone ?? 'N/A'}  |  Earthquake Zone: ${input.eqZone ?? 'N/A'}
Risk Score: ${riskPct}

=== SCENARIO ===
${simLine}

=== PEAK DEMAND ESTIMATES ===
Rice: ${input.demand.rice.toLocaleString('en-US')} kg
Water: ${input.demand.water.toLocaleString('en-US')} L
Medical Kits: ${input.demand.meds.toLocaleString('en-US')} units
Hygiene Kits: ${input.demand.kits.toLocaleString('en-US')} units

=== 7-DAY FORECAST ===
Total estimated cost: ${weekCost}

Paragraph 1 - Risk overview: Summarize the vulnerability profile of this area. Reference specific data points (coastal status, flood/earthquake zone, poverty rate) and explain why the risk score is what it is.

Paragraph 2 - Resource demand justification: Explain why the demand estimates are set at these specific quantities. Connect them to population size, household count, hazard type, and poverty rate. If a figure seems high or low relative to population, explain why.

Paragraph 3 - Immediate pre-positioning actions: Give 2-3 concrete, time-bound logistics actions relief coordinators should take within 72 hours. Base these on the hazard type, flood/earthquake zone classification, and coastal status. Do NOT cite specific quantities or name specific agencies - focus on the category of action and the reasoning behind it.

Paragraph 4 - Longer-term preparedness gaps: Identify 1-2 structural vulnerabilities (e.g. road access in flood zones, coastal warehouse exposure, low-income household reach) and recommend a specific mitigation measure for each.`
}

/* ── Sanitise AI output for jsPDF ───────────────────────────────── */
// jsPDF's built-in Helvetica only handles ASCII. Strip anything it can't render.

function sanitizeText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")   // smart single quotes -> straight
    .replace(/[\u201C\u201D]/g, '"')   // smart double quotes -> straight
    .replace(/\u2014/g, '-')           // em dash -> hyphen
    .replace(/\u2013/g, '-')           // en dash -> hyphen
    .replace(/\u2026/g, '...')         // ellipsis -> three dots
    .replace(/\u00A0/g, ' ')           // non-breaking space -> regular space
    .replace(/\u20B1/g, 'PHP ')        // peso sign -> PHP
    .replace(/[^\x00-\x7F]/g, '')      // strip any remaining non-ASCII
    .replace(/[ \t]+/g, ' ')           // collapse multiple spaces
    .trim()
}

/* ── Main export ────────────────────────────────────────────────── */

export async function generateExplanation(
  input: ExplainInput,
  apiKey?: string,
): Promise<ExplainResult> {
  // Return cached result immediately if available
  const cached = getCachedExplanation(input)
  if (cached) return cached

  const key = apiKey ?? (import.meta.env.VITE_LLM_API_KEY as string | undefined)
  if (!key) throw new Error('VITE_LLM_API_KEY is not set.')

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 600,
      temperature: 0.35,
      top_p: 0.9,
      messages: [
        {
          role: 'system',
          content:
            'You are a disaster-preparedness analyst. Always respond in plain ASCII text only. Never use smart quotes, em dashes, bullet points, or markdown formatting.',
        },
        {
          role: 'user',
          content: buildPrompt(input),
        },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Groq API error ${res.status}: ${body}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: { content?: string }
    }>
  }

  const raw = data.choices?.[0]?.message?.content ?? ''
  const text = sanitizeText(raw) || 'No explanation could be generated.'

  const result: ExplainResult = { text, generatedAt: new Date().toISOString() }

  // Write to both in-memory and localStorage so it survives page refreshes
  const ck = cacheKey(input)
  _mem.set(ck, result)
  lsWrite(ck, result)

  return result
}