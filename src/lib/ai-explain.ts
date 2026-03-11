/**
 * ai-explain.ts
 * Generates a disaster-preparedness narrative via the Groq API (free tier).
 *
 * Set VITE_GROQ_API_KEY in your .env file.
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

  return `You are a senior disaster-preparedness analyst for the Philippine government. Write a professional assessment report section (3 short paragraphs, 220 words max total) based on the data below.

Rules:
- Plain text ONLY. No markdown, no bullet points, no headers, no numbered lists.
- Use only basic ASCII characters. No smart quotes, no em dashes, no curly apostrophes.
- Use straight single quotes (') and hyphens (-) instead of dashes.
- Separate paragraphs with a single blank line.

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

Paragraph 1 - Risk overview: Summarise the vulnerability profile of this area and why the risk score is as stated.
Paragraph 2 - Resource demand justification: Explain the estimated demand figures in context of population size, hazard type, and socioeconomic factors.
Paragraph 3 - Recommended actions: Give 2-3 concrete pre-positioning or logistics recommendations for relief coordinators.`
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
      max_tokens: 512,
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

  return { text, generatedAt: new Date().toISOString() }
}