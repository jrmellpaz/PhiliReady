import { useWeather } from '#/lib/queries'
import { Droplets, Wind, CloudRain } from 'lucide-react'

export function WeatherStrip() {
  const { data: weather, isLoading } = useWeather()

  if (isLoading) {
    return (
      <div className="weather-strip">
        <span className="weather-strip-loading">Loading weather…</span>
      </div>
    )
  }

  if (!weather?.length) return null

  return (
    <div className="weather-strip">
      <span className="weather-strip-title">
        <CloudRain size={13} />
        7-Day Weather
      </span>
      <div className="weather-strip-days">
        {weather.map((day) => (
          <div
            key={day.date}
            className={`weather-day ${day.alert ? 'weather-day-alert' : ''}`}
          >
            <span className="weather-day-date">
              {new Date(day.date).toLocaleDateString('en-PH', {
                weekday: 'short',
              })}
            </span>
            <div className="weather-day-stat">
              <Droplets size={10} />
              <span>{day.precipMm.toFixed(0)}mm</span>
            </div>
            <div className="weather-day-stat">
              <Wind size={10} />
              <span>{day.windKmh.toFixed(0)}km/h</span>
            </div>
            {day.alert && <span className="weather-day-badge">⚠</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
