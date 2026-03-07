import { Suspense, lazy } from 'react'

const PhiliMap = lazy(() => import('./PhiliMap'))

export function MapWrapper(props: React.ComponentProps<typeof PhiliMap>) {
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Suspense fallback={<MapSkeleton />}>
        {typeof window !== 'undefined' && <PhiliMap {...props} />}
      </Suspense>
    </div>
  )
}

function MapSkeleton() {
  return (
    <div className="map-skeleton">
      <span className="map-skeleton-text">Initializing map…</span>
    </div>
  )
}
