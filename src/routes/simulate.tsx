import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as Tabs from '@radix-ui/react-tabs'
import * as Slider from '@radix-ui/react-slider'
import { useSimulation, useForecast } from '#/lib/queries'
import { ForecastChart } from '../components/forecast/ForecastChart'
import type { HazardType } from '#/lib/types'
import { useState } from 'react'

const HAZARDS: { value: HazardType; label: string }[] = [
  { value: 'typhoon', label: 'Typhoon' },
  { value: 'flood', label: 'Flood' },
  { value: 'earthquake', label: 'Earthquake' },
  { value: 'volcanic', label: 'Volcanic' },
]

const PREVIEW_PCODE = '1380600000' // Manila — always seeded

export const Route = createFileRoute('/simulate')({
  component: SimulatePage,
})

function SimulatePage() {
  const navigate = useNavigate()
  const simulation = useSimulation()

  const [hazard, setHazard] = useState<HazardType>('typhoon')
  const [severity, setSeverity] = useState(2)

  const { data: preview } = useForecast(PREVIEW_PCODE, hazard, severity)

  const handleActivate = () => {
    simulation.mutate(
      { hazardType: hazard, severity },
      {
        onSuccess: () => {
          navigate({
            to: '/',
            search: { sim: 'active', hazard, severity },
          })
        },
      },
    )
  }

  return (
    <main className="simulate-page">
      <h1 className="simulate-title">Disaster Scenario Simulator</h1>
      <p className="simulate-subtitle">
        Model how a disaster event affects relief goods demand across all
        monitored cities.
      </p>

      <div className="simulate-controls">
        {/* Hazard selector — Radix Tabs */}
        <div className="simulate-field">
          <label className="simulate-label">Hazard Type</label>
          <Tabs.Root
            value={hazard}
            onValueChange={(v) => setHazard(v as HazardType)}
          >
            <Tabs.List className="simulate-options">
              {HAZARDS.map((h) => (
                <Tabs.Trigger
                  key={h.value}
                  value={h.value}
                  className="simulate-option"
                >
                  {h.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs.Root>
        </div>

        {/* Severity — Radix Slider */}
        <div className="simulate-field">
          <label className="simulate-label">
            Severity Level: <strong>{severity}</strong>
          </label>
          <Slider.Root
            className="radix-slider-root simulate-slider-root"
            min={1}
            max={4}
            step={1}
            value={[severity]}
            onValueChange={([v]) => setSeverity(v)}
          >
            <Slider.Track className="radix-slider-track">
              <Slider.Range className="radix-slider-range" />
            </Slider.Track>
            <Slider.Thumb className="radix-slider-thumb" />
          </Slider.Root>
          <div className="simulate-slider-labels">
            <span>1 Minor</span>
            <span>2 Moderate</span>
            <span>3 Major</span>
            <span>4 Catastrophic</span>
          </div>
        </div>

        {/* Activate */}
        <button
          className="simulate-activate-btn"
          onClick={handleActivate}
          disabled={simulation.isPending}
        >
          {simulation.isPending ? 'Computing…' : 'Activate Simulation'}
        </button>
      </div>

      {/* Preview forecast for Manila */}
      <div className="simulate-preview">
        <h2 className="simulate-preview-title">
          Preview — Manila (PSGC {PREVIEW_PCODE})
        </h2>
        <p className="simulate-preview-subtitle">
          {hazard.charAt(0).toUpperCase() + hazard.slice(1)} · Severity{' '}
          {severity}
        </p>
        {preview ? (
          <ForecastChart data={preview} />
        ) : (
          <p className="simulate-preview-loading">Loading preview…</p>
        )}
      </div>
    </main>
  )
}
