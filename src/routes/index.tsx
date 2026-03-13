import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { MapWrapper } from '../components/map/MapWrapper'
import { DetailPanel } from '../components/map/DetailPanel'
import { FormulaSheet } from '../components/map/FormulaSheet'
import { WeatherStrip } from '../components/weather/WeatherStrip'
import { useSheetState } from '#/lib/sheet-state'
import { DialogSheet, ScrollableSheet, BottomSheet, PageSheet } from '#/components/ui/SilkSheets'
import { SimulateContent } from '#/components/simulator/SimulateContent'
import { SimulatorContent } from '#/components/simulator/SimulatorContent'
import { LoginContent } from '#/components/auth/LoginContent'
import { AdminContent } from '#/components/auth/AdminContent'
import { PricesContent } from '#/components/auth/PricesContent'
import Footer from '../components/Footer'
import type { HazardType } from '#/lib/types'
import { ChatBot } from '#/components/chat/ChatBot'

interface DashboardSearch {
  sim?: string
  hazard?: HazardType
  severity?: number
  modal?: string
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    sim: search.sim as string | undefined,
    hazard: search.hazard as HazardType | undefined,
    severity: search.severity ? Number(search.severity) : undefined,
    modal: search.modal as string | undefined,
  }),
  component: Dashboard,
})

function Dashboard() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [simActive, setSimActive] = useState(search.sim === 'active')
  const [simHazard, setSimHazard] = useState(search.hazard)
  const [simSeverity, setSimSeverity] = useState(search.severity)

  const { openSheet, close } = useSheetState()

  const [selectedCity, setSelectedCity] = useState<{
    pcode: string
    name: string
  } | null>(null)
  const lastCityRef = useRef(selectedCity)
  if (selectedCity) lastCityRef.current = selectedCity
  const displayCity = selectedCity ?? lastCityRef.current

  const handleSimActivate = (hazard: HazardType, severity: number) => {
    setSimActive(true)
    setSimHazard(hazard)
    setSimSeverity(severity)
    navigate({ search: { sim: 'active', hazard, severity } })
  }

  const closeModal = () => {
    navigate({
      search: (prev: DashboardSearch) => {
        const { modal: _, ...rest } = prev
        return rest
      },
    })
  }

  return (
    <div className="dashboard-layout">
      {/* Map fills the entire viewport area below navbar */}
      <div className="dashboard-map">
        <MapWrapper
          onCitySelect={(pcode, name) => setSelectedCity({ pcode, name })}
          selectedPcode={selectedCity?.pcode ?? null}
          simHazard={simHazard}
          simSeverity={simSeverity}
          simActive={simActive}
        />

        {/* Desktop-only: left panel with legend + simulate */}
        <div className="map-panel-left">
          <div className="map-overlay map-legend">
            <div className="legend-label">Demand Level</div>
            <div className="legend-bar" />
          </div>
          <SimulateContent onActivate={handleSimActivate} />
          {simActive && (
            <div className="map-overlay map-sim-badge-panel">
              <span className="topbar-sim-badge">
                🔴 SIM: {simHazard?.toUpperCase()} · Severity {simSeverity}
              </span>
            </div>
          )}
          <ChatBot defaultCollapsed={true} context={{ simActive, hazard: simHazard, severity: simSeverity, selectedCity: selectedCity?.name }} />
        </div>

        {/* Mobile-only: floating legend */}
        <div className="map-overlay map-overlay-topleft map-legend map-legend-mobile">
          <div className="legend-label">Demand Level</div>
          <div className="legend-bar" />
          {simActive && (
            <span className="topbar-sim-badge">
              🔴 SIM: {simHazard?.toUpperCase()} · Severity {simSeverity}
            </span>
          )}
        </div>

        <div className="map-overlay map-overlay-topright">
          <WeatherStrip />
        </div>
      </div>

      {/* City detail — sidebar sheet */}
      {displayCity && (
        <DetailPanel
          pcode={displayCity.pcode}
          name={displayCity.name}
          presented={selectedCity !== null}
          onClose={() => setSelectedCity(null)}
          hazard={simHazard}
          severity={simSeverity}
          simActive={simActive}
        />
      )}

      {/* Simulate — scrollable sheet (mobile only, desktop has inline panel) */}
      <ScrollableSheet presented={openSheet === 'simulate'} onClose={close}>
        <SimulateContent onActivate={handleSimActivate} />
      </ScrollableSheet>

      <PageSheet presented={openSheet === 'assistant'} onClose={close} swipeDismissal={false}>
        <div className="assistant-page">
          <ChatBot context={{ simActive, hazard: simHazard, severity: simSeverity, selectedCity: selectedCity?.name }} />
        </div>
      </PageSheet>

      {/* What-If Forecaster — tall scrollable sheet, URL-intercepted */}
      <ScrollableSheet
        presented={search.modal === 'simulator'}
        onClose={closeModal}
        tall
      >
        <SimulatorContent />
      </ScrollableSheet>

      {/* Login — dialog sheet */}
      <DialogSheet presented={openSheet === 'login'} onClose={close}>
        <LoginContent />
      </DialogSheet>

      {/* Admin — scrollable sheet, URL-intercepted */}
      <ScrollableSheet
        presented={search.modal === 'admin'}
        onClose={closeModal}
        tall
      >
        <AdminContent />
      </ScrollableSheet>

      {/* Prices — scrollable sheet, URL-intercepted */}
      <ScrollableSheet
        presented={search.modal === 'prices'}
        onClose={closeModal}
        tall
      >
        <PricesContent />
      </ScrollableSheet>

      {/* Formula Sheet — scrollable sheet */}
      <ScrollableSheet presented={openSheet === 'formula'} onClose={close}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <FormulaSheet onClose={close} />
        </div>
      </ScrollableSheet>

      <Footer />
    </div>
  )
}
