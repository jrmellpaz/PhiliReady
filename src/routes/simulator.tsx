import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import * as Select from '@radix-ui/react-select'
import * as Slider from '@radix-ui/react-slider'
import { ChevronDown, RefreshCw } from 'lucide-react'
import { useCustomCityForecast } from '#/lib/queries'
import { ForecastChart } from '../components/forecast/ForecastChart'
import type { HazardType } from '#/lib/types'

interface SimulatorSearch {
  population?: number
  households?: number
  is_coastal?: number
  poverty_pct?: number
  flood_zone?: string
  eq_zone?: string
  hazard_type?: string
  severity?: number
}

export const Route = createFileRoute('/simulator')({
  validateSearch: (search: Record<string, unknown>): SimulatorSearch => ({
    population: search.population ? Number(search.population) : undefined,
    households: search.households ? Number(search.households) : undefined,
    is_coastal: search.is_coastal ? Number(search.is_coastal) : undefined,
    poverty_pct: search.poverty_pct ? Number(search.poverty_pct) : undefined,
    flood_zone: search.flood_zone as string | undefined,
    eq_zone: search.eq_zone as string | undefined,
    hazard_type: search.hazard_type as string | undefined,
    severity: search.severity ? Number(search.severity) : undefined,
  }),
  component: SimulatorPage,
})

function buildParams(values: {
  population: number
  households: number
  isCoastal: number
  povertyPct: number
  floodZone: string
  eqZone: string
  hazardType: HazardType
  severity: number
}) {
  return {
    population: values.population,
    households: values.households,
    is_coastal: values.isCoastal,
    poverty_pct: values.povertyPct,
    flood_zone: values.floodZone,
    eq_zone: values.eqZone,
    hazard_type: values.hazardType,
    severity: values.severity,
  }
}

function SimulatorPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const defaults = {
    population: search.population ?? 500000,
    households: search.households ?? Math.round(500000 / 4.1),
    isCoastal: search.is_coastal ?? 0,
    povertyPct: search.poverty_pct ?? 0.2,
    floodZone: search.flood_zone ?? 'medium',
    eqZone: search.eq_zone ?? 'medium',
    hazardType: (search.hazard_type as HazardType | undefined) ?? 'typhoon',
    severity: search.severity ?? 2,
  }

  const form = useForm({
    defaultValues: defaults,
    onSubmit: () => {},
  })

  const values = useStore(form.baseStore, (s) => s.values)

  const [committedParams, setCommittedParams] = useState(() =>
    buildParams(defaults),
  )

  const currentParams = buildParams(values)
  const isDirty =
    JSON.stringify(currentParams) !== JSON.stringify(committedParams)

  const handleUpdate = () => {
    const p = buildParams(values)
    setCommittedParams(p)
    navigate({ search: p })
  }

  const {
    data: forecast,
    isLoading,
    isFetching,
  } = useCustomCityForecast(
    committedParams.population > 0 ? committedParams : null,
  )

  const totalWeekCost = forecast?.reduce((sum, d) => sum + d.totalCost, 0) ?? 0

  return (
    <main className="simulator-page simulator-page--route">
      <h1 className="simulator-title">What-If Forecaster</h1>
      <p className="simulator-subtitle">
        Build a hypothetical city profile and forecast its 7-day relief demand.
        URL is bookmarkable.
      </p>

      <div className="simulator-results" style={{ minHeight: 260 }}>
        <div
          className="simulator-chart-wrap"
          style={{
            filter: isFetching ? 'blur(3px)' : 'none',
            opacity: isFetching ? 0.5 : 1,
            transition: 'filter 200ms ease, opacity 200ms ease',
          }}
        >
          {forecast ? (
            <>
              <div className="simulator-cost-banner">
                <span>Estimated 7-Day Total Cost</span>
                <strong>₱{totalWeekCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
              <ForecastChart data={forecast} />
            </>
          ) : isLoading ? (
            <p className="simulator-loading">Computing forecast...</p>
          ) : (
            <p className="simulator-placeholder">
              Set a population to see results.
            </p>
          )}
        </div>
      </div>

      <div className="simulator-controls">
        <div className="sim-row">
          <form.Field name="population">
            {(field) => (
              <div className="sim-field">
                <label className="sim-label">Population</label>
                <input
                  type="number"
                  min={1}
                  className="sim-input"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="households">
            {(field) => (
              <div className="sim-field">
                <label className="sim-label">Households</label>
                <input
                  type="number"
                  min={1}
                  className="sim-input"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              </div>
            )}
          </form.Field>
        </div>

        <div className="sim-row">
          <form.Field name="isCoastal">
            {(field) => (
              <div className="sim-field">
                <label className="sim-label">Coastal?</label>
                <Select.Root
                  value={String(field.state.value)}
                  onValueChange={(v) => field.handleChange(Number(v))}
                >
                  <Select.Trigger className="sim-select radix-select-trigger">
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown size={14} />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      className="radix-select-content"
                      position="popper"
                      sideOffset={4}
                    >
                      <Select.Viewport>
                        <Select.Item value="0" className="radix-select-item">
                          <Select.ItemText>Inland</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="1" className="radix-select-item">
                          <Select.ItemText>Coastal</Select.ItemText>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            )}
          </form.Field>

          <form.Field name="povertyPct">
            {(field) => (
              <div className="sim-field">
                <label className="sim-label">
                  Poverty %: {(field.state.value * 100).toFixed(0)}%
                </label>
                <Slider.Root
                  className="radix-slider-root"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[field.state.value]}
                  onValueChange={([v]) => field.handleChange(v)}
                >
                  <Slider.Track className="radix-slider-track">
                    <Slider.Range className="radix-slider-range" />
                  </Slider.Track>
                  <Slider.Thumb className="radix-slider-thumb" />
                </Slider.Root>
              </div>
            )}
          </form.Field>
        </div>

        <div className="sim-row">
          <form.Field name="floodZone">
            {(field) => (
              <div className="sim-field">
                <label className="sim-label">Flood Zone</label>
                <Select.Root
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                >
                  <Select.Trigger className="sim-select radix-select-trigger">
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown size={14} />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      className="radix-select-content"
                      position="popper"
                      sideOffset={4}
                    >
                      <Select.Viewport>
                        <Select.Item value="low" className="radix-select-item">
                          <Select.ItemText>Low</Select.ItemText>
                        </Select.Item>
                        <Select.Item
                          value="medium"
                          className="radix-select-item"
                        >
                          <Select.ItemText>Medium</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="high" className="radix-select-item">
                          <Select.ItemText>High</Select.ItemText>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            )}
          </form.Field>

          <form.Field name="eqZone">
            {(field) => (
              <div className="sim-field">
                <label className="sim-label">Earthquake Zone</label>
                <Select.Root
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                >
                  <Select.Trigger className="sim-select radix-select-trigger">
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown size={14} />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      className="radix-select-content"
                      position="popper"
                      sideOffset={4}
                    >
                      <Select.Viewport>
                        <Select.Item value="low" className="radix-select-item">
                          <Select.ItemText>Low</Select.ItemText>
                        </Select.Item>
                        <Select.Item
                          value="medium"
                          className="radix-select-item"
                        >
                          <Select.ItemText>Medium</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="high" className="radix-select-item">
                          <Select.ItemText>High</Select.ItemText>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            )}
          </form.Field>
        </div>

        <div className="sim-row">
          <form.Field name="hazardType">
            {(field) => (
              <div className="sim-field">
                <label className="sim-label">Hazard Type</label>
                <Select.Root
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v as HazardType)}
                >
                  <Select.Trigger className="sim-select radix-select-trigger">
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown size={14} />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      className="radix-select-content"
                      position="popper"
                      sideOffset={4}
                    >
                      <Select.Viewport>
                        <Select.Item
                          value="typhoon"
                          className="radix-select-item"
                        >
                          <Select.ItemText>Typhoon</Select.ItemText>
                        </Select.Item>
                        <Select.Item
                          value="flood"
                          className="radix-select-item"
                        >
                          <Select.ItemText>Flood</Select.ItemText>
                        </Select.Item>
                        <Select.Item
                          value="earthquake"
                          className="radix-select-item"
                        >
                          <Select.ItemText>Earthquake</Select.ItemText>
                        </Select.Item>
                        <Select.Item
                          value="volcanic"
                          className="radix-select-item"
                        >
                          <Select.ItemText>Volcanic</Select.ItemText>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            )}
          </form.Field>

          <form.Field name="severity">
            {(field) => (
              <div className="sim-field">
                <label className="sim-label">
                  Severity: <strong>{field.state.value}</strong>
                </label>
                <Slider.Root
                  className="radix-slider-root"
                  min={1}
                  max={4}
                  step={1}
                  value={[field.state.value]}
                  onValueChange={([v]) => field.handleChange(v)}
                >
                  <Slider.Track className="radix-slider-track">
                    <Slider.Range className="radix-slider-range" />
                  </Slider.Track>
                  <Slider.Thumb className="radix-slider-thumb" />
                </Slider.Root>
              </div>
            )}
          </form.Field>
        </div>

        <button
          className="simulator-update-btn"
          onClick={handleUpdate}
          disabled={!isDirty || isFetching}
        >
          <RefreshCw size={14} />
          {isFetching ? 'Updating…' : 'Update Forecast'}
        </button>
      </div>
    </main>
  )
}
