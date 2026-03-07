import { useCityDetail, useForecast } from '#/lib/queries'
import { ForecastChart } from '#/components/forecast/ForecastChart'
import { getDemandColor, getRiskLabel } from '#/lib/colors'
import { SidebarSheet } from '#/components/ui/SilkSheets'
import type { HazardType } from '#/lib/types'

interface Props {
  pcode: string
  name: string
  presented: boolean
  onClose: () => void
  hazard?: HazardType
  severity?: number
  simActive: boolean
}

const ITEMS = [
  { key: 'rice', label: 'Rice', unit: 'kg', color: '#2B7DE9' },
  { key: 'water', label: 'Water', unit: 'L', color: '#0EA47A' },
  { key: 'meds', label: 'Med Kits', unit: 'units', color: '#D48B0A' },
  { key: 'kits', label: 'Hygiene Kits', unit: 'units', color: '#D03050' },
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

  if (cityLoading)
    return (
      <PanelShell name={name} presented={presented} onClose={onClose}>
        <Spinner />
      </PanelShell>
    )

  const totalWeekCost = forecast?.reduce((sum, d) => sum + d.totalCost, 0) ?? 0

  return (
    <PanelShell name={name} presented={presented} onClose={onClose}>
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
        <Stat
          label="Population"
          value={city?.population.toLocaleString() ?? '—'}
        />
        <Stat
          label="Households"
          value={city?.households.toLocaleString() ?? '—'}
        />
        <Stat
          label="Risk Score"
          value={`${((city?.riskScore ?? 0) * 100).toFixed(0)}%`}
          color={getDemandColor(city?.riskScore ?? 0)}
        />
        <Stat
          label="7-Day Cost"
          value={`₱${totalWeekCost.toLocaleString()}`}
          color="#D48B0A"
        />
      </div>

      {/* Demand bars */}
      <div className="panel-demand-section">
        <p className="panel-section-label">PEAK DEMAND ESTIMATE</p>
        {ITEMS.map(({ key, label, unit, color }) => {
          const demand = city?.demand
          const val = demand ? demand[key] : 0
          const max = 20000
          return (
            <div key={key} className="panel-demand-item">
              <div className="panel-demand-header">
                <span className="panel-demand-label">{label}</span>
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
      </div>

      {/* Forecast chart */}
      <p className="panel-section-label">7-DAY FORECAST</p>
      {fxLoading ? <Spinner /> : forecast && <ForecastChart data={forecast} />}

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

function PanelShell({
  name,
  presented,
  onClose,
  children,
}: {
  name: string
  presented: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <SidebarSheet presented={presented} onClose={onClose}>
      <div className="detail-panel">
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
