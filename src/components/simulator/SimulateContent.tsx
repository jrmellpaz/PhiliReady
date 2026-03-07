import { useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import * as Slider from '@radix-ui/react-slider'
import { useSimulation } from '#/lib/queries'
import { useSheetState } from '#/lib/sheet-state'
import { CloudRain, Waves, Activity, Mountain } from 'lucide-react'
import type { HazardType } from '#/lib/types'

const HAZARDS: { value: HazardType; label: string; icon: React.ReactNode }[] = [
  { value: 'typhoon', label: 'Typhoon', icon: <CloudRain size={18} /> },
  { value: 'flood', label: 'Flood', icon: <Waves size={18} /> },
  { value: 'earthquake', label: 'Quake', icon: <Activity size={18} /> },
  { value: 'volcanic', label: 'Volcanic', icon: <Mountain size={18} /> },
]

interface SimulateContentProps {
  onActivate: (hazard: HazardType, severity: number) => void
}

export function SimulateContent({ onActivate }: SimulateContentProps) {
  const { close } = useSheetState()
  const simulation = useSimulation()

  const [hazard, setHazard] = useState<HazardType>('typhoon')
  const [severity, setSeverity] = useState(2)

  const handleActivate = () => {
    simulation.mutate(
      { hazardType: hazard, severity },
      {
        onSuccess: () => {
          onActivate(hazard, severity)
          close()
        },
      },
    )
  }

  return (
    <div className="simulate-page">
      <h1 className="simulate-title">Disaster Scenario Simulator</h1>
      <p className="simulate-subtitle">
        Model how a disaster event affects relief goods demand across all
        monitored cities.
      </p>

      <div className="simulate-controls">
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
                  <span className="simulate-option-icon">{h.icon}</span>
                  {h.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs.Root>
        </div>

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
            <span>Minor</span>
            <span>Moderate</span>
            <span>Major</span>
            <span>Catastrophic</span>
          </div>
        </div>

        <button
          className="simulate-activate-btn"
          onClick={handleActivate}
          disabled={simulation.isPending}
        >
          {simulation.isPending ? 'Computing…' : 'Activate Simulation'}
        </button>
      </div>
    </div>
  )
}
