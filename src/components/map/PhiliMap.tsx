// ⚠️ CLIENT-ONLY — never import directly, use MapWrapper
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, ZoomControl } from 'react-leaflet'
import type { Feature, FeatureCollection } from 'geojson'
import type { Layer, PathOptions } from 'leaflet'
import L from 'leaflet'
import { getDemandColor } from '#/lib/colors'
import { useDemandHeatmap } from '#/lib/queries'
import type { HazardType } from '#/lib/types'
import '#/lib/leaflet-fix'

interface Props {
  onCitySelect: (pcode: string, name: string) => void
  selectedPcode: string | null
  simHazard?: string
  simSeverity?: number
  simActive: boolean
}

export default function PhiliMap({
  onCitySelect,
  selectedPcode,
  simHazard,
  simSeverity,
  simActive,
}: Props) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null)
  const geoRef = useRef<L.GeoJSON | null>(null)
  const selectedRef = useRef(selectedPcode)
  selectedRef.current = selectedPcode

  const { data: scores, isLoading } = useDemandHeatmap(
    simActive ? (simHazard as HazardType) : undefined,
    simActive ? simSeverity : undefined,
  )

  const scoresRef = useRef(scores)
  scoresRef.current = scores

  useEffect(() => {
    fetch('/geo/municities.json')
      .then((res) => res.json())
      .then(setGeoData)
      .catch(console.error)
  }, [])

  function getStyle(feature?: Feature): PathOptions {
    const pcode =
      feature?.properties?.adm3_psgc ?? feature?.properties?.ADM3_PCODE ?? ''
    const score = scoresRef.current?.[pcode] ?? 0.1
    const isSelected = pcode === selectedRef.current
    return {
      fillColor: getDemandColor(score),
      fillOpacity: isSelected ? 0.95 : 0.65,
      color: isSelected ? '#ffffff' : 'transparent',
      weight: isSelected ? 5 : 0,
      opacity: 1,
    }
  }

  // Re-apply styles when selectedPcode changes
  useEffect(() => {
    if (!geoRef.current) return
    geoRef.current.eachLayer((layer) => {
      const feature = (layer as any).feature as Feature | undefined
      ;(layer as L.Path).setStyle(getStyle(feature))
      if (
        feature &&
        (feature.properties?.adm3_psgc ?? feature.properties?.ADM3_PCODE) ===
          selectedPcode
      ) {
        ;(layer as any).bringToFront()
      }
    })
  }, [selectedPcode])

  function onEachFeature(feature: Feature, layer: Layer) {
    const props = feature.properties ?? {}
    const pcode = props.adm3_psgc ?? props.ADM3_PCODE ?? ''
    const name = props.ADM3_EN ?? props.name ?? 'Unknown'
    const score = scoresRef.current?.[pcode] ?? 0

    layer.bindTooltip(
      `<div style="font-family:'Inter',sans-serif;font-size:12px;padding:4px 8px;background:rgba(255,255,255,0.92);backdrop-filter:blur(8px);color:#1a2744;border-radius:8px;border:1px solid #c5cfe0;box-shadow:0 2px 8px rgba(30,58,95,0.1)">
        <strong>${name}</strong><br/>
        Demand: ${(score * 100).toFixed(0)}%
      </div>`,
      { sticky: true, className: 'map-tooltip' },
    )
    ;(layer as any).on({
      mouseover(e: any) {
        e.target.setStyle({
          fillOpacity: 0.9,
          weight: 2,
          color: '#1e3a5f',
        })
        e.target.bringToFront()
      },
      mouseout(e: any) {
        e.target.setStyle(getStyle(feature))
      },
      click() {
        onCitySelect(pcode, name)
      },
    })
  }

  return (
    <MapContainer
      center={[12.8797, 121.774]}
      zoom={6}
      minZoom={5}
      maxZoom={13}
      maxBounds={[
        [4.2, 114.0],
        [21.5, 128.0],
      ]}
      maxBoundsViscosity={1.0}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
      <ZoomControl position="bottomright" />
      {!isLoading && scores && geoData && (
        <GeoJSON
          ref={geoRef}
          key={JSON.stringify(scores)}
          data={geoData}
          style={getStyle}
          onEachFeature={onEachFeature}
        />
      )}
    </MapContainer>
  )
}
