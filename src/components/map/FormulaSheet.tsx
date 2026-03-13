import { X as XIcon } from 'lucide-react'
import { ITEMS } from './DetailPanel'

interface Props {
  onClose: () => void
}

export function FormulaSheet({ onClose }: Props) {
  return (
    <main className="simulator-page">
        <h1 className="simulator-title">Relevant Information</h1> 
        <p className="simulator-subtitle">
          Detailed formulas, constants, and definitions for disaster demand calculations.
        </p>

        <div className="panel-formula-body">
          <p className="panel-formula-section">Core formula</p>
          <div className="panel-formula-code">
            <div>displacement_rate = min(</div>
            <div className="panel-formula-indent">BASE_DISPLACEMENT[severity]</div>
            <div className="panel-formula-indent">× ZONE_MODIFIER[hazard_zone]</div>
            <div className="panel-formula-indent">× coastal_modifier</div>
            <div className="panel-formula-indent">× (1.0 + poverty_pct^0.7 × 1.2)</div>
            <div className="panel-formula-indent">× SEASONAL_MULTIPLIER[month],</div>
            <div className="panel-formula-indent">0.85  ← cap</div>
            <div>)</div>
            <div style={{ marginTop: 6 }}>displaced_HH = households × displacement_rate</div>
            <div>hh_size_factor = (population / households) / 4.1</div>
            <div>base_demand = displaced_HH × SPHERE_RATE × hh_size_factor</div>
            <div>daily_demand = base_demand × CURVE[hazard][day]</div>
          </div>

          <p className="panel-formula-section">Demand % — how it's computed</p>
          <div className="panel-formula-mode-card">
            <span className="panel-formula-mode-badge panel-formula-mode-badge--baseline">Baseline mode</span>
            <div className="panel-formula-code" style={{ marginTop: 6 }}>
              <div>{'demand_% = risk_score × 100'}</div>
            </div>
            <p className="panel-formula-mode-note">
              No hazard selected. The map shows each city's pre-computed composite
              risk score (population 25% + poverty 20% + coastal 15% + flood zone 20%
              + EQ zone 20%), clamped to [0.05, 0.99].
            </p>
          </div>
          <div className="panel-formula-mode-card" style={{ marginTop: 6 }}>
            <span className="panel-formula-mode-badge panel-formula-mode-badge--sim">Simulation mode</span>
            <div className="panel-formula-code" style={{ marginTop: 6 }}>
              <div>raw_score = peak_rice_demand / households</div>
              <div>{'demand_% = (raw_score / max across all cities) × 100'}</div>
            </div>
            <p className="panel-formula-mode-note">
              Hazard + severity selected. A full 7-day forecast runs for every city.
              Peak rice demand is divided by household count to get a per-HH score,
              then normalized so the city with the highest score = 100%.
            </p>
          </div>

          <p className="panel-formula-section">SPHERE rates per item</p>
          {ITEMS.map(({ key, label, unit, color, Icon, sphereRate, basis }) => (
            <div key={key} className="panel-formula-item">
              <span className="panel-formula-item-icon" style={{ color }}>
                <Icon size={12} />
              </span>
              <div>
                <span className="panel-formula-item-label">{label}</span>
                <span className="panel-formula-item-rate">{sphereRate}</span>
                <span className="panel-formula-item-basis">{basis}</span>
              </div>
            </div>
          ))}

          <p className="panel-formula-section">Key constants</p>
          <div className="panel-formula-constants">
            <div className="panel-formula-constant">
              <span>Severity → base rate</span>
              <span>1→10% · 2→20% · 3→35% · 4→55%</span>
            </div>
            <div className="panel-formula-constant">
              <span>Zone modifier</span>
              <span>low 0.7 · medium 1.0 · high 1.3</span>
            </div>
            <div className="panel-formula-constant">
              <span>Coastal modifier</span>
              <span>×1.2 (typhoon/flood only)</span>
            </div>
            <div className="panel-formula-constant">
              <span>Nat'l avg HH size</span>
              <span>4.1 (PSA 2020 Census)</span>
            </div>
            <div className="panel-formula-constant">
              <span>Confidence band</span>
              <span>±20% of daily demand</span>
            </div>
          </div>

          <p className="panel-formula-section">Definition of Terms</p>
          <div className="panel-formula-glossary">
            {([
              ['Demand', 'The quantity of a relief goods needed to meet the essential needs of affected populations. Calculated based on Sphere standards and adjusted for local context.'],
              ['DOH', 'Department of Health — reference for medicine kit costing'],
              ['DSWD', 'Department of Social Welfare and Development — reference for hygiene kit procurement costs'],
              ['DRRMO', 'Disaster Risk Reduction and Management Office — city/municipality-level disaster response agencies'],
              ['HH', 'Household — the primary unit for demand calculations'],
              ['LGU', 'Local Government Unit — cities/municipalities/provinces responsible for disaster response on the ground'],
              ['NDRRMC', 'National Disaster Risk Reduction and Management Council — source of historical Philippine displacement data'],
              ['PAGASA', 'Philippine Atmospheric, Geophysical and Astronomical Services Administration — source of seasonal multipliers'],
              ['PHIVOLCS', 'Philippine Institute of Volcanology and Seismology — source of earthquake/volcanic zone classifications'],
              ['PSA', 'Philippine Statistics Authority — source of census and poverty data'],
              ['PSGC', 'Philippine Standard Geographic Code — canonical city/municipality identifiers'],
              ['Risk', 'The potential for loss or harm to people and assets in areas, based on a composite of factors including population, poverty, coastal exposure, and historical hazard impact.'],
              ['SPHERE', 'Sphere Humanitarian Standards — international minimum standards for humanitarian response (4th ed. 2018)'],
              ['WASH', 'Water, Sanitation, and Hygiene — Sphere WASH standards define hygiene kit allocation'],
              ['WHO', 'World Health Organization — source for Emergency Health Kit guidelines'],
            ] as [string, string][]).map(([term, def]) => (
              <div key={term} className="panel-formula-glossary-item">
                <span className="panel-formula-glossary-term">{term}</span>
                <span className="panel-formula-glossary-def">{def}</span>
              </div>
            ))}
          </div>

          <p className="panel-formula-note">
            Based on Sphere Humanitarian Standards (2018) and NDRRMC historical displacement data.
            Source: forecast_service.py, demand_service.py, cities.py
          </p>
        </div>
    </main>
  )
}