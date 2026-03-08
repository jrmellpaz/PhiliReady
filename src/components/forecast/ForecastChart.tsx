import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { ForecastPoint } from '#/lib/types'

const SERIES = [
  { key: 'rice', label: 'Rice (kg)', color: '#4A9EFF' },
  { key: 'water', label: 'Water (L)', color: '#16C79A' },
  { key: 'meds', label: 'Med Kits', color: '#F5A623' },
  { key: 'kits', label: 'Hygiene', color: '#E94560' },
] as const

function ForecastTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload as ForecastPoint
  return (
    <div
      style={{
        background: '#132848',
        border: '1px solid #1E3A5F',
        borderRadius: 6,
        fontSize: 10,
        fontFamily: 'monospace',
        padding: '8px 10px',
        color: '#E8EDF4',
      }}
    >
      <p style={{ marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {SERIES.map(({ key, label: l, color }) => (
        <p key={key} style={{ color, margin: '2px 0' }}>
          {l}: {(data[key as keyof ForecastPoint] as number).toLocaleString()}
          <span style={{ color: '#6B7F99', marginLeft: 6 }}>
            ₱
            {(
              data[`${key}Cost` as keyof ForecastPoint] as number
            ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </p>
      ))}
      <p
        style={{
          color: '#F5A623',
          marginTop: 4,
          borderTop: '1px solid #1E3A5F',
          paddingTop: 4,
        }}
      >
        Total: ₱{data.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}

export function ForecastChart({ data }: { data: ForecastPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart
        data={data}
        margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
      >
        <defs>
          {SERIES.map(({ key, color }) => (
            <linearGradient
              key={key}
              id={`grad-${key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#1E3A5F"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          tick={{
            fontSize: 9,
            fill: '#6B7F99',
            fontFamily: 'monospace',
          }}
          tickLine={false}
        />
        <YAxis
          tick={{
            fontSize: 9,
            fill: '#6B7F99',
            fontFamily: 'monospace',
          }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<ForecastTooltip />} />
        <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
        {SERIES.map(({ key, label, color }) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            name={label}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${key})`}
            dot={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
