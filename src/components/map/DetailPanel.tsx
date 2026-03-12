import { useState, useEffect } from 'react'
import { useCityDetail, useForecast, useMe, useUpdateCity } from '#/lib/queries'
import { ForecastChart } from '#/components/forecast/ForecastChart'
import { getDemandColor, getRiskLabel } from '#/lib/colors'
import { SidebarSheet } from '#/components/ui/SilkSheets'
import {
  Pencil,
  Wheat, Droplets, HeartPulse, ShowerHead,
  Info,
} from 'lucide-react'
import type { HazardType, CityDetail } from '#/lib/types'
import { ExportButton } from '#/components/export/ExportButton'
import {
  generateExplanation,
  getCachedExplanation,
  clearCachedExplanation,
} from '#/lib/ai-explain'
import type { ExplainInput } from '#/lib/ai-explain'
import { FormulaSheet } from './FormulaSheet'
import { AiAssessment } from './AiAssessment'

interface Props {
  pcode: string
  name: string
  presented: boolean
  onClose: () => void
  hazard?: HazardType
  severity?: number
  simActive: boolean
}

export const ITEMS = [
  {
    key: 'rice', label: 'Rice', unit: 'kg', color: '#2B7DE9',
    Icon: Wheat,
    sphereRate: '1.5 kg / displaced HH / day',
    basis: 'Sphere Standard: 2,100 kcal/person/day (~500 g rice × ~3 persons needing food aid per HH)',
  },
  {
    key: 'water', label: 'Water', unit: 'L', color: '#0EA47A',
    Icon: Droplets,
    sphereRate: '15 L / displaced HH / day',
    basis: 'Sphere Standard: 15 L/person/day minimum for drinking, cooking, and hygiene',
  },
  {
    key: 'meds', label: 'Med Kits', unit: 'units', color: '#D48B0A',
    Icon: HeartPulse,
    sphereRate: '0.08 kits / displaced HH / day',
    basis: '~1 kit per 12 HH/day. Based on WHO Emergency Health Kit guidelines',
  },
  {
    key: 'kits', label: 'Hygiene Kits', unit: 'units', color: '#D03050',
    Icon: ShowerHead,
    sphereRate: '0.07 kits / displaced HH / day',
    basis: '~1 kit per 14 HH/day. Based on Sphere WASH standards',
  },
] as const

export function DetailPanel({
  pcode,
  name,
  presented,
  onClose,
  hazard,
  severity,
  simActive,
}: Props) {
  const { data: city, isLoading: cityLoading } = useCityDetail(pcode)
  const { data: forecast, isLoading: fxLoading } = useForecast(
    pcode,
    simActive ? hazard : undefined,
    simActive ? severity : undefined,
  )
  const { data: me } = useMe()
  const [editing, setEditing] = useState(false)
  const [showFormula, setShowFormula] = useState(false)

  // ── AI assessment state ──────────────────────────────────────────
  const [aiText, setAiText]         = useState<string | null>(null)
  const [aiLoading, setAiLoading]   = useState(false)
  const [aiError, setAiError]       = useState<string | null>(null)
  const [aiExpanded, setAiExpanded] = useState(true)

  // Derive explainInput early (may be null while data loads)
  const totalWeekCost = forecast?.reduce((sum, d) => sum + d.totalCost, 0) ?? 0

  const explainInput: ExplainInput | null = city && forecast
    ? {
        cityName: name,
        province: city.province,
        region: city.region,
        population: city.population,
        households: city.households,
        povertyPct: city.povertyPct,
        isCoastal: !!city.isCoastal,
        floodZone: city.floodZone,
        eqZone: city.eqZone,
        riskScore: city.riskScore,
        demand: city.demand,
        totalWeekCost,
        simActive,
        hazard,
        severity,
      }
    : null

  // Resolve which text to use: local state > cache > null
  const resolvedAiText = aiText
    ?? (explainInput ? getCachedExplanation(explainInput)?.text ?? null : null)

  const handleGenerateAI = async () => {
    if (!explainInput) return
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await generateExplanation(explainInput)
      setAiText(result.text)
      setAiExpanded(true)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate assessment.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleRegenerateAI = async () => {
    if (!explainInput) return
    // Bust the cache for this city so a fresh call is made
    clearCachedExplanation(explainInput)
    setAiText(null)
    await handleGenerateAI()
  }

  // Reset local AI state whenever the city or active scenario changes.
  useEffect(() => {
    setAiText(null)
    setAiError(null)
    setAiLoading(false)
    setAiExpanded(true)
  }, [pcode, hazard, severity, simActive])

  // Auto-generate when city data + forecast are ready, unless already cached.
  useEffect(() => {
    if (!explainInput) return
    if (resolvedAiText) return
    handleGenerateAI()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explainInput])

  if (cityLoading)
    return (
      <PanelShell name={name} presented={presented} onClose={onClose}>
        <Spinner />
      </PanelShell>
    )

  return (
    <PanelShell
      name={name}
      presented={presented}
      onClose={onClose}
      absoluteAction={
        explainInput && forecast ? (
          <div className="panel-export-abs">
            <ExportButton
              input={explainInput}
              forecast={forecast}
              cachedAiText={resolvedAiText}
            />
          </div>
        ) : undefined
      }
    >
      {/* Location + Risk badge */}
      <div className="panel-location">
        <span className="panel-location-text">
          {city?.province} · {city?.region}
        </span>
      </div>
      <div className="panel-badges">
        <span
          className="panel-badge"
          style={{
            background: getDemandColor(city?.riskScore ?? 0) + '22',
            color: getDemandColor(city?.riskScore ?? 0),
            borderColor: getDemandColor(city?.riskScore ?? 0) + '44',
          }}
        >
          {getRiskLabel(city?.riskScore ?? 0)}
        </span>
        <span className="panel-badge panel-badge-zone">
          {city?.zoneType.toUpperCase()}
        </span>
        {simActive && (
          <span className="panel-badge panel-badge-sim">SIM ACTIVE</span>
        )}
      </div>

      {/* Stats grid */}
      <div className="panel-stats-grid">
        <Stat label="Population" value={city?.population.toLocaleString() ?? '—'} />
        <Stat label="Households" value={city?.households.toLocaleString() ?? '—'} />
        <Stat
          label="Risk Score"
          value={`${((city?.riskScore ?? 0) * 100).toFixed(0)}%`}
          color={getDemandColor(city?.riskScore ?? 0)}
        />
        <Stat
          label="7-Day Cost"
          value={`₱${totalWeekCost.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          color="#D48B0A"
        />
      </div>

      {/* Edit Parameters */}
      {me && !editing && (
        <button
          type="button"
          className="panel-edit-btn"
          onClick={() => setEditing(true)}
        >
          <Pencil size={13} />
          Edit Parameters
        </button>
      )}
      {editing && city && (
        <EditCityForm
          pcode={pcode}
          city={city}
          onClose={() => {
            setEditing(false)
            // Bust AI cache when data changes so next generation is fresh
            if (explainInput) clearCachedExplanation(explainInput)
            setAiText(null)
          }}
        />
      )}

      {/* Demand bars */}
      <div className="panel-demand-section">
        <div className="panel-demand-section-header">
          <p className="panel-section-label" style={{ margin: 0 }}>PEAK DEMAND ESTIMATE</p>
          <button
            type="button"
            className="panel-formula-btn"
            onClick={() => setShowFormula(true)}
            title="View formula"
          >
            <Info size={13} />
          </button>
        </div>

        {ITEMS.map(({ key, label, unit, color, Icon }) => {
          const demand = city?.demand
          const val = demand ? demand[key] : 0
          const max = 20000
          return (
            <div key={key} className="panel-demand-item">
              <div className="panel-demand-header">
                <span className="panel-demand-label">
                  <span className="panel-demand-icon" style={{ color }}>
                    <Icon size={13} />
                  </span>
                  {label}
                </span>
                <span className="panel-demand-value" style={{ color }}>
                  {val.toLocaleString()} {unit}
                </span>
              </div>
              <div className="panel-demand-bar-bg">
                <div
                  className="panel-demand-bar-fill"
                  style={{
                    width: `${Math.min((val / max) * 100, 100)}%`,
                    background: color,
                  }}
                />
              </div>
            </div>
          )
        })}

        {showFormula && <FormulaSheet onClose={() => setShowFormula(false)} />}
      </div>

      {/* Forecast chart */}
      <p className="panel-section-label">7-DAY FORECAST</p>
      {fxLoading ? <Spinner /> : forecast && <ForecastChart data={forecast} />}

      {/* AI Assessment */}
      {explainInput && (
        <AiAssessment
          explainInput={explainInput}
          resolvedAiText={resolvedAiText}
          aiLoading={aiLoading}
          aiError={aiError}
          aiExpanded={aiExpanded}
          onRegenerate={handleRegenerateAI}
          onRetry={handleGenerateAI}
          onToggleExpand={() => setAiExpanded(v => !v)}
        />
      )}

      {/* Audit trail */}
      {city?.updatedBy && (
        <p className="panel-audit">
          Last edited by {city.updatedBy}
          {city.updatedAt &&
            ` · ${new Date(city.updatedAt).toLocaleDateString()}`}
        </p>
      )}
    </PanelShell>
  )
}

/* ── Edit City Form ────────────────────────────────────────────── */

interface EditFormProps {
  pcode: string
  city: CityDetail
  onClose: () => void
}

function EditCityForm({ pcode, city, onClose }: EditFormProps) {
  const mutation = useUpdateCity()
  const [msg, setMsg] = useState<string | null>(null)
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')

  // Pre-fill from current city data where available
  const [population, setPopulation] = useState(String(city.population))
  const [households, setHouseholds] = useState(String(city.households))
  const [povertyPct, setPovertyPct] = useState(
    String((city.povertyPct * 100).toFixed(1)),
  )
  const [isCoastal, setIsCoastal] = useState(String(city.isCoastal))
  const [floodZone, setFloodZone] = useState(city.floodZone)
  const [eqZone, setEqZone] = useState(city.eqZone)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)

    // Build payload with all editable fields
    const body: Record<string, unknown> = {}
    if (population) body.population = parseInt(population, 10)
    if (households) body.households = parseInt(households, 10)
    if (povertyPct) body.povertyPct = parseFloat(povertyPct) / 100
    body.isCoastal = parseInt(isCoastal, 10)
    body.floodZone = floodZone
    body.eqZone = eqZone

    mutation.mutate(
      { pcode, body },
      {
        onSuccess: (data) => {
          setMsg(`Updated! New risk score: ${(data.riskScore * 100).toFixed(0)}%`)
          setMsgType('success')
        },
        onError: (err) => {
          setMsg(err instanceof Error ? err.message : 'Failed to update.')
          setMsgType('error')
        },
      },
    )
  }

  return (
    <div className="panel-edit-section">
      <p className="panel-section-label">EDIT PARAMETERS</p>
      <form className="panel-edit-form" onSubmit={handleSubmit}>
        <div className="panel-edit-row">
          <label className="panel-edit-field">
            <span className="panel-edit-label">Population</span>
            <input
              type="number"
              className="panel-edit-input"
              value={population}
              onChange={(e) => setPopulation(e.target.value)}
              min={1}
              required
            />
          </label>
          <label className="panel-edit-field">
            <span className="panel-edit-label">Households</span>
            <input
              type="number"
              className="panel-edit-input"
              value={households}
              onChange={(e) => setHouseholds(e.target.value)}
              min={1}
              required
            />
          </label>
        </div>

        <div className="panel-edit-row">
          <label className="panel-edit-field">
            <span className="panel-edit-label">Poverty %</span>
            <input
              type="number"
              className="panel-edit-input"
              value={povertyPct}
              onChange={(e) => setPovertyPct(e.target.value)}
              min={0}
              max={100}
              step={0.1}
            />
          </label>
          <label className="panel-edit-field">
            <span className="panel-edit-label">Coastal</span>
            <select
              className="panel-edit-select"
              value={isCoastal}
              onChange={(e) => setIsCoastal(e.target.value)}
            >
              <option value="0">Inland</option>
              <option value="1">Coastal</option>
            </select>
          </label>
        </div>

        <div className="panel-edit-row">
          <label className="panel-edit-field">
            <span className="panel-edit-label">Flood Zone</span>
            <select
              className="panel-edit-select"
              value={floodZone}
              onChange={(e) => setFloodZone(e.target.value)}
            >
              <option value="">—</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="panel-edit-field">
            <span className="panel-edit-label">Earthquake Zone</span>
            <select
              className="panel-edit-select"
              value={eqZone}
              onChange={(e) => setEqZone(e.target.value)}
            >
              <option value="">—</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <div className="panel-edit-actions">
          <button
            type="submit"
            className="panel-edit-save"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            type="button"
            className="panel-edit-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
        {msg && (
          <p
            className={`panel-edit-msg ${msgType === 'error' ? 'panel-edit-msg--error' : ''}`}
          >
            {msg}
          </p>
        )}
      </form>
    </div>
  )
}

/* ── Shell / helpers ───────────────────────────────────────────── */

function PanelShell({
  name,
  presented,
  onClose,
  absoluteAction,
  children,
}: {
  name: string
  presented: boolean
  onClose: () => void
  absoluteAction?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <SidebarSheet presented={presented} onClose={onClose}>
      <div className="detail-panel">
        {/* Sits in the same stacking context as SilkSheets' close btn */}
        {absoluteAction}
        <div className="panel-header">
          <h2 className="panel-title">{name}</h2>
        </div>
        {children}
      </div>
    </SidebarSheet>
  )
}

function Stat({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="panel-stat">
      <p className="panel-stat-label">{label}</p>
      <p className="panel-stat-value" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  )
}

function Spinner() {
  return <div className="panel-spinner">loading...</div>
}