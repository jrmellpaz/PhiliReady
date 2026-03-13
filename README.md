# PhiliReady

A comprehensive disaster preparedness and response planning platform for the Philippines, providing real-time demand forecasting and resource allocation for humanitarian relief operations.

## Overview

PhiliReady is a web-based application that helps disaster response teams and local government units (LGUs) plan and execute effective humanitarian aid distribution during natural disasters. The platform combines geospatial data, demographic information, and humanitarian standards to provide accurate demand forecasts for essential relief goods.

### Key Features

- **Interactive Map Interface**: Philippine municipality-level visualization with demand heatmaps
- **Disaster Simulation**: What-if scenario modeling for typhoons, floods, earthquakes, and volcanic eruptions
- **Demand Forecasting**: 7-day projections for rice, water, medical kits, and hygiene kits
- **AI-Powered Assessment**: Intelligent analysis and recommendations for response planning
- **Weather Integration**: Real-time weather data for operational awareness
- **Administrative Tools**: User management, price configuration, and data administration
- **Export Capabilities**: PDF reports and data export functionality

## Technology Stack

- **Frontend**: TanStack Start - React 19, TypeScript, ESLint, TanStack Router, Tailwind CSS
- **Mapping**: Leaflet with React-Leaflet
- **Charts**: Recharts
- **UI Components**: Radix UI, Lucide Icons
- **Build Tool**: Vite
- **Backend**: Python/FastAPI (assumed from context)
- **Database**: PostgreSQL (assumed from context)

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm or pnpm
- Backend API server (see backend documentation)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd PhiliReady
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file with:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

### Testing

```bash
npm run test
```

### Code Quality

```bash
npm run lint    # ESLint
npm run format  # Prettier
npm run check   # Format and lint
```

## Data Sources & Methodology

### Geographic Data
- **PSGC**: Philippine Standard Geographic Code for municipality identification
- **Municipality Boundaries**: GeoJSON data processed via `scripts/merge-geojson.cjs`

### Demographic Data
- **Population & Households**: Philippine Statistics Authority (PSA) 2020 Census
- **Poverty Rates**: PSA poverty incidence data
- **Household Size**: National average of 4.1 persons per household

### Hazard Data
- **Flood Zones**: Local DRRMO classifications (Low/Medium/High)
- **Earthquake Zones**: PHIVOLCS seismic hazard maps
- **Coastal Classification**: Based on proximity to coastlines
- **Volcanic Zones**: PHIVOLCS volcanic hazard maps

### Standards & References
- **SPHERE Standards**: Humanitarian minimum standards (4th ed. 2018)
- **WHO Guidelines**: Emergency Health Kit specifications
- **NDRRMC Data**: Historical displacement patterns
- **PAGASA**: Seasonal weather multipliers

## Demand Calculation Formulas

### Core Displacement Formula

```
displacement_rate = min(
    BASE_DISPLACEMENT[severity]
    × ZONE_MODIFIER[hazard_zone]
    × coastal_modifier
    × (1.0 + poverty_pct^0.7 × 1.2)
    × SEASONAL_MULTIPLIER[month],
    0.85  ← cap
)

displaced_HH = households × displacement_rate

hh_size_factor = (population / households) / 4.1

base_demand = displaced_HH × SPHERE_RATE × hh_size_factor

daily_demand = base_demand × CURVE[hazard][day]
```

### Key Constants

| Parameter | Values |
|-----------|--------|
| Severity Levels | 1→10%, 2→20%, 3→35%, 4→55% |
| Zone Modifiers | Low: 0.7, Medium: 1.0, High: 1.3 |
| Coastal Modifier | ×1.2 (typhoon/flood only) |
| National HH Size | 4.1 (PSA 2020 Census) |
| Confidence Band | ±20% of daily demand |

### SPHERE Standard Rates

| Item | Rate | Basis |
|------|------|-------|
| **Rice** | 1.5 kg/displaced HH/day | 2,100 kcal/person/day (~500g rice × 3 persons needing aid per HH) |
| **Water** | 15 L/displaced HH/day | Minimum for drinking, cooking, and hygiene |
| **Medical Kits** | 0.08 kits/displaced HH/day | ~1 kit per 12 HH/day (WHO Emergency Health Kit) |
| **Hygiene Kits** | 0.07 kits/displaced HH/day | ~1 kit per 14 HH/day (Sphere WASH standards) |

### Risk Score Calculation

The baseline risk score is a composite metric:
- Population: 25%
- Poverty Rate: 20%
- Coastal Exposure: 15%
- Flood Zone: 20%
- Earthquake Zone: 20%

Clamped to range [0.05, 0.99].

## Application Architecture

### Frontend Structure

```
src/
├── components/
│   ├── map/           # Map visualization and controls
│   ├── forecast/      # Demand forecasting charts
│   ├── weather/       # Weather data display
│   ├── simulator/     # Disaster simulation interface
│   ├── auth/          # Authentication components
│   ├── chat/          # AI assistant chatbot
│   ├── export/        # PDF export functionality
│   └── ui/            # Reusable UI components
├── lib/
│   ├── api.ts         # API client and types
│   ├── queries.ts     # TanStack Query hooks
│   ├── types.ts       # TypeScript type definitions
│   ├── colors.ts      # Color schemes and utilities
│   └── ai-explain.ts  # AI assessment types
├── routes/            # TanStack Router route definitions
└── styles.css         # Global styles and Tailwind imports
```

### Key Components

- **MapWrapper**: Main map interface with Leaflet integration
- **DetailPanel**: City information sidebar with demand details
- **ForecastChart**: Time-series visualization of demand forecasts
- **SimulateContent**: Disaster scenario configuration
- **AiAssessment**: AI-powered analysis and recommendations
- **WeatherStrip**: Real-time weather information display

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/map/demand-heat` | GET | Demand heatmap data |
| `/cities/{pcode}` | GET | City demographic details |
| `/forecast/{pcode}` | GET | 7-day demand forecast |
| `/auth/login` | POST | User authentication |
| `/auth/me` | GET | Current user profile |
| `/admin/users` | GET | User management (admin) |
| `/prices` | GET | Relief goods pricing |
| `/api/v1/explain` | POST | AI assessment generation |

## Usage Guide

### Basic Operation

1. **View Baseline Risk**: The default map shows composite risk scores for all municipalities
2. **Select a City**: Click on any municipality to view detailed information
3. **Run Simulation**: Use the "Simulate" panel to model disaster scenarios
4. **Review Forecasts**: Examine 7-day demand projections and cost estimates
5. **Export Reports**: Generate PDF reports for planning and coordination

### Simulation Mode

- Select hazard type (typhoon, flood, earthquake, volcanic)
- Choose severity level (1-4)
- View updated demand heatmaps and forecasts
- Access AI assessment for strategic recommendations

### Administrative Features

- **User Management**: Add/edit users and assign municipality access
- **Price Configuration**: Update costs for relief goods
- **Data Administration**: Modify city data and risk parameters

## Development

### Project Structure

The application follows a modular architecture with clear separation of concerns:

- **Components**: Reusable UI components with single responsibilities
- **Hooks**: Custom React hooks for data fetching and state management
- **Types**: Comprehensive TypeScript definitions
- **API Layer**: Centralized API client with error handling
- **Routing**: File-based routing with TanStack Router

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with TanStack configuration
- **Prettier**: Automated code formatting
- **Vitest**: Unit testing framework
- **Tailwind CSS**: Utility-first styling approach

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run test suite |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run check` | Format and lint |

## Acknowledgments

- Philippine Statistics Authority (PSA) for demographic data
- Department of Social Welfare and Development (DSWD) for relief standards
- Philippine Institute of Volcanology and Seismology (PHIVOLCS) for hazard data
- Philippine Atmospheric, Geophysical and Astronomical Services Administration (PAGASA) for weather data
- SPHERE Project for humanitarian standards
- World Health Organization (WHO) for health guidelines
---

*Built with ❤️ for Philippine disaster resilience*
