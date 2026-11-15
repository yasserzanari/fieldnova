import { useEffect, useRef } from 'react'
import { Map as MapLibreMap, RasterTileSource, ScaleControl, setWorkerUrl, type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl'
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { FeatureCollection } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { GeoPoint } from '../../lib/geo/location'
import type { PowerGridCell } from '../../lib/nasa/power'
import { formatArea, formatDistance, useMeasurementSystem } from '../../lib/units/measurement-units'
import { formatGibsDate, resolveGibsDate, useGibsAvailability } from '../../lib/nasa/gibs-availability'
import { useParcelBoundary } from '../../lib/geo/parcel-boundary'
import './field-map.css'

setWorkerUrl(mapLibreWorkerUrl)

export type MapBaseLayer = 'streets' | 'nasa'

type Props = {
  center: GeoPoint
  selectedPoint: GeoPoint
  baseLayer: MapBaseLayer
  showNdvi: boolean
  showSurfaceSoil?: boolean
  showRootSoil?: boolean
  powerGridCell?: PowerGridCell | null
  draftParcelPoints?: GeoPoint[]
  drawingParcel?: boolean
  imageryDate: string
  onPointSelect: (point: GeoPoint) => void
  onMapReady?: (map: MapLibreMap) => void
  className?: string
  ariaLabel?: string
}

const OSM_ATTRIBUTION = '© OpenStreetMap contributors'
const NASA_ATTRIBUTION = 'NASA EOSDIS GIBS · MODIS/Terra · SMAP'

function gibsTileUrl(layer: string, date: string, format: 'jpg' | 'png', matrixSet = 'GoogleMapsCompatible_Level9') {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/${matrixSet}/{z}/{y}/{x}.${format}`
}

export function FieldMap({ center, selectedPoint, baseLayer, showNdvi, showSurfaceSoil = false, showRootSoil = false, powerGridCell, draftParcelPoints = [], drawingParcel = false, imageryDate, onPointSelect, onMapReady, className = '', ariaLabel = 'Carte interactive FieldNova' }: Props) {
  const measurementSystem = useMeasurementSystem()
  const { availability, error: availabilityError } = useGibsAvailability()
  const trueColorDate = resolveGibsDate(imageryDate, availability?.trueColor)
  const ndviDate = resolveGibsDate(imageryDate, availability?.ndvi)
  const surfaceSoilDate = availability?.surfaceSoil.at(-1)?.end ?? null
  const rootSoilDate = availability?.rootSoil.at(-1)?.end ?? null
  const dateStatus = availabilityError ? 'Dates NASA non récupérées; la couche récente par défaut est affichée.' : 'Date réellement disponible sur NASA GIBS.'
  const dateLoading = !availability && !availabilityError
  const parcel = useParcelBoundary()
  const parcelBoundary = parcel?.feature ?? null
  const parcelLabel = parcel ? ` Limite affichée : ${parcel.feature.properties?.name ?? 'parcelle importée'}, environ ${formatArea(parcel.areaHectares, measurementSystem)}.` : ''
  const draftParcelLabel = drawingParcel ? ` Tracé de parcelle en cours : ${draftParcelPoints.length} sommet(s); les sommets ne sont pas encore enregistrés.` : ''
  const gridCellLabel = powerGridCell ? ` Maille météo NASA POWER indiquée par un contour vert discontinu, environ ${formatDistance(powerGridCell.properties.widthKm, measurementSystem)} par ${formatDistance(powerGridCell.properties.heightKm, measurementSystem)}.` : ''
  const mapLabel = `${ariaLabel}.${parcelLabel}${draftParcelLabel}${gridCellLabel}`
  const legendItems = [
    ...(baseLayer === 'nasa' ? [{ id: 'truecolor', label: `MODIS Terra · composition couleur · ${trueColorDate ? formatGibsDate(trueColorDate) : dateLoading ? 'récupération…' : 'date NASA indisponible'}`, detail: `${trueColorDate && trueColorDate !== imageryDate ? `Date demandée : ${imageryDate}; date NASA la plus proche utilisée. ` : ''}${dateStatus} Image composite; visualisation à sa plus haute résolution nominale d’environ 250 m/pixel à l’équateur, pas une mesure ni une limite de parcelle.` }] : []),
    ...(showNdvi ? [{ id: 'ndvi', label: `NDVI MODIS Terra · composite 8 jours · ${ndviDate ? formatGibsDate(ndviDate) : dateLoading ? 'récupération…' : 'date NASA indisponible'}`, detail: `${ndviDate && ndviDate !== imageryDate ? `Date demandée : ${imageryDate}; date NASA la plus proche utilisée. ` : ''}${dateStatus} Résolution nominale du produit : 250 m au nadir; composite glissant de 8 jours, pas une mesure parcellaire.`, legendUrl: 'https://gibs.earthdata.nasa.gov/legends/MODIS_NDVI_H.svg' }] : []),
    ...(showSurfaceSoil ? [{ id: 'surface', label: `SMAP L4 · humidité de surface · ${surfaceSoilDate ? formatGibsDate(surfaceSoilDate) : dateLoading ? 'récupération…' : 'date NASA indisponible'} · ~${formatDistance(9, measurementSystem)} `, detail: dateStatus, legendUrl: 'https://gibs.earthdata.nasa.gov/legends/SMAP_Analyzed_Soil_Moisture_H.svg' }] : []),
    ...(showRootSoil ? [{ id: 'root', label: `SMAP L4 · humidité zone racinaire · ${rootSoilDate ? formatGibsDate(rootSoilDate) : dateLoading ? 'récupération…' : 'date NASA indisponible'} · ~${formatDistance(9, measurementSystem)}`, detail: dateStatus, legendUrl: 'https://gibs.earthdata.nasa.gov/legends/SMAP_Analyzed_Soil_Moisture_H.svg' }] : []),
    ...(powerGridCell ? [{ id: 'power', label: 'Maille NASA POWER', detail: `≈ ${formatDistance(powerGridCell.properties.widthKm, measurementSystem)} × ${formatDistance(powerGridCell.properties.heightKm, measurementSystem)} · contour vert discontinu; pas une parcelle.` }] : []),
    ...(parcel ? [{ id: 'parcel', label: parcel.feature.properties?.name ?? 'Parcelle importée', detail: `Contour saisi/importé · ≈ ${formatArea(parcel.areaHectares, measurementSystem)}.` }] : []),
    ...(baseLayer === 'streets' && !showNdvi && !showSurfaceSoil && !showRootSoil ? [{ id: 'osm', label: 'Fond de rues · OpenStreetMap', detail: '© OpenStreetMap contributors.' }] : []),
  ]
  const hasNasaLayers = legendItems.some(item => item.id === 'truecolor' || item.id === 'ndvi' || item.id === 'surface' || item.id === 'root')
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const scaleRef = useRef<ScaleControl | null>(null)
  const onSelectRef = useRef(onPointSelect)
  const onReadyRef = useRef(onMapReady)
  onSelectRef.current = onPointSelect
  onReadyRef.current = onMapReady

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = new MapLibreMap({
      container,
      center: [center.longitude, center.latitude],
      zoom: 5,
      minZoom: 2,
      maxZoom: 14,
      maxPitch: 0,
      dragRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            maxzoom: 19,
            attribution: OSM_ATTRIBUTION,
          },
          nasaTrueColor: {
            type: 'raster',
            tiles: [gibsTileUrl('MODIS_Terra_CorrectedReflectance_TrueColor', trueColorDate ?? 'default', 'jpg')],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 9,
            attribution: NASA_ATTRIBUTION,
          },
          nasaNdvi: {
            type: 'raster',
            tiles: [gibsTileUrl('MODIS_Terra_NDVI_8Day', ndviDate ?? 'default', 'png')],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 9,
            attribution: NASA_ATTRIBUTION,
          },
          smapSurface: {
            type: 'raster',
            tiles: [gibsTileUrl('SMAP_L4_Analyzed_Surface_Soil_Moisture', surfaceSoilDate ?? 'default', 'png', 'GoogleMapsCompatible_Level6')],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 6,
            attribution: NASA_ATTRIBUTION,
          },
          smapRoot: {
            type: 'raster',
            tiles: [gibsTileUrl('SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', rootSoilDate ?? 'default', 'png', 'GoogleMapsCompatible_Level6')],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 6,
            attribution: NASA_ATTRIBUTION,
          },
          selectedPoint: {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [selectedPoint.longitude, selectedPoint.latitude] } }],
            },
          },
          powerGridCell: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: powerGridCell ? [powerGridCell] : [] },
          },
          parcelBoundary: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
          parcelDraft: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
        },
        layers: [
          { id: 'osm-streets', type: 'raster', source: 'osm', layout: { visibility: 'visible' } },
          { id: 'nasa-truecolor', type: 'raster', source: 'nasaTrueColor', layout: { visibility: baseLayer === 'nasa' ? 'visible' : 'none' }, paint: { 'raster-opacity': 1 } },
          { id: 'nasa-ndvi', type: 'raster', source: 'nasaNdvi', layout: { visibility: showNdvi ? 'visible' : 'none' }, paint: { 'raster-opacity': 0.82 } },
          { id: 'smap-surface-soil', type: 'raster', source: 'smapSurface', layout: { visibility: showSurfaceSoil ? 'visible' : 'none' }, paint: { 'raster-opacity': 0.56 } },
          { id: 'smap-root-soil', type: 'raster', source: 'smapRoot', layout: { visibility: showRootSoil ? 'visible' : 'none' }, paint: { 'raster-opacity': 0.56 } },
          { id: 'power-grid-cell-fill', type: 'fill', source: 'powerGridCell', paint: { 'fill-color': '#c8ec92', 'fill-opacity': 0.11 } },
          { id: 'power-grid-cell-line', type: 'line', source: 'powerGridCell', paint: { 'line-color': '#dff4ad', 'line-width': 2, 'line-opacity': 0.95, 'line-dasharray': [2, 2] } },
          { id: 'parcel-boundary-fill', type: 'fill', source: 'parcelBoundary', paint: { 'fill-color': '#b5df80', 'fill-opacity': 0.2 } },
          { id: 'parcel-boundary-line', type: 'line', source: 'parcelBoundary', paint: { 'line-color': '#efffc7', 'line-width': 3, 'line-opacity': 0.95 } },
          { id: 'parcel-draft-fill', type: 'fill', source: 'parcelDraft', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#b5df80', 'fill-opacity': 0.18 } },
          { id: 'parcel-draft-line-halo', type: 'line', source: 'parcelDraft', filter: ['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]], paint: { 'line-color': '#fffefa', 'line-width': 5, 'line-opacity': 0.92 } },
          { id: 'parcel-draft-line', type: 'line', source: 'parcelDraft', filter: ['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]], paint: { 'line-color': '#416b3b', 'line-width': 2.5, 'line-dasharray': [2, 1] } },
          { id: 'parcel-draft-points', type: 'circle', source: 'parcelDraft', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 5, 'circle-color': '#416b3b', 'circle-stroke-color': '#fffefa', 'circle-stroke-width': 2 } },
          { id: 'selected-point-halo', type: 'circle', source: 'selectedPoint', paint: { 'circle-radius': 10, 'circle-color': '#fffefa', 'circle-opacity': 0.9 } },
          { id: 'selected-point', type: 'circle', source: 'selectedPoint', paint: { 'circle-radius': 5, 'circle-color': '#286b45', 'circle-stroke-color': '#fffefa', 'circle-stroke-width': 2 } },
        ],
      },
    })
    mapRef.current = map
    onReadyRef.current?.(map)
    const scale = new ScaleControl({ maxWidth: 110, unit: measurementSystem === 'us-customary' ? 'imperial' : 'metric' })
    scaleRef.current = scale
    map.addControl(scale, 'bottom-right')
    map.on('click', (event: MapMouseEvent) => onSelectRef.current({ latitude: Number(event.lngLat.lat.toFixed(5)), longitude: Number(event.lngLat.lng.toFixed(5)) }))
    map.on('error', event => {
      if (event.error) console.warn('FieldNova map tile error:', event.error.message)
    })

    return () => {
      map.remove()
      mapRef.current = null
      scaleRef.current = null
    }
    // The map is initialized once; source, marker, and visibility changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scaleRef.current?.setUnit(measurementSystem === 'us-customary' ? 'imperial' : 'metric')
  }, [measurementSystem])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.isStyleLoaded()) {
      map.setLayoutProperty('osm-streets', 'visibility', 'visible')
      map.setLayoutProperty('nasa-truecolor', 'visibility', baseLayer === 'nasa' ? 'visible' : 'none')
      map.setLayoutProperty('nasa-ndvi', 'visibility', showNdvi ? 'visible' : 'none')
      map.setLayoutProperty('smap-surface-soil', 'visibility', showSurfaceSoil ? 'visible' : 'none')
      map.setLayoutProperty('smap-root-soil', 'visibility', showRootSoil ? 'visible' : 'none')
    } else {
      map.once('load', () => {
        map.setLayoutProperty('osm-streets', 'visibility', 'visible')
        map.setLayoutProperty('nasa-truecolor', 'visibility', baseLayer === 'nasa' ? 'visible' : 'none')
        map.setLayoutProperty('nasa-ndvi', 'visibility', showNdvi ? 'visible' : 'none')
        map.setLayoutProperty('smap-surface-soil', 'visibility', showSurfaceSoil ? 'visible' : 'none')
        map.setLayoutProperty('smap-root-soil', 'visibility', showRootSoil ? 'visible' : 'none')
      })
    }
  }, [baseLayer, showNdvi, showSurfaceSoil, showRootSoil])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const updatePoint = () => {
      const source = map.getSource('selectedPoint') as GeoJSONSource | undefined
      source?.setData({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [selectedPoint.longitude, selectedPoint.latitude] } })
    }
    if (map.isStyleLoaded()) updatePoint()
    else map.once('load', updatePoint)
  }, [selectedPoint.latitude, selectedPoint.longitude])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const updateGridCell = () => {
      const source = map.getSource('powerGridCell') as GeoJSONSource | undefined
      source?.setData({ type: 'FeatureCollection', features: powerGridCell ? [powerGridCell] : [] })
    }
    if (map.isStyleLoaded()) updateGridCell()
    else map.once('load', updateGridCell)
  }, [powerGridCell])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const updateParcel = () => {
      const source = map.getSource('parcelBoundary') as GeoJSONSource | undefined
      source?.setData(parcelBoundary ?? { type: 'FeatureCollection', features: [] })
    }
    if (map.isStyleLoaded()) updateParcel()
    else map.once('load', updateParcel)
  }, [parcelBoundary])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const updateDraft = () => {
      const source = map.getSource('parcelDraft') as GeoJSONSource | undefined
      const positions = draftParcelPoints.map(point => [point.longitude, point.latitude] as [number, number])
      const features: FeatureCollection['features'] = []
      if (positions.length >= 3) {
        const ring = [...positions, positions[0]]
        features.push({ type: 'Feature', properties: { kind: 'outline' }, geometry: { type: 'Polygon', coordinates: [ring] } })
      } else if (positions.length === 2) {
        features.push({ type: 'Feature', properties: { kind: 'outline' }, geometry: { type: 'LineString', coordinates: positions } })
      }
      for (const coordinates of positions) features.push({ type: 'Feature', properties: { kind: 'vertex' }, geometry: { type: 'Point', coordinates } })
      source?.setData({ type: 'FeatureCollection', features })
    }
    if (map.isStyleLoaded()) updateDraft()
    else map.once('load', updateDraft)
  }, [draftParcelPoints])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.getCanvas().style.cursor = drawingParcel ? 'crosshair' : ''
    if (drawingParcel) map.doubleClickZoom.disable()
    else map.doubleClickZoom.enable()
    return () => {
      map.getCanvas().style.cursor = ''
      map.doubleClickZoom.enable()
    }
  }, [drawingParcel])

  useEffect(() => {
    const map = mapRef.current
    if (!drawingParcel || !map) return
    map.flyTo({ center: [selectedPoint.longitude, selectedPoint.latitude], zoom: 14, duration: 450 })
  }, [drawingParcel, selectedPoint.latitude, selectedPoint.longitude])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const updateDate = () => {
      const trueSource = map.getSource('nasaTrueColor') as RasterTileSource | undefined
      const ndviSource = map.getSource('nasaNdvi') as RasterTileSource | undefined
      trueSource?.setTiles([gibsTileUrl('MODIS_Terra_CorrectedReflectance_TrueColor', trueColorDate ?? 'default', 'jpg')])
      ndviSource?.setTiles([gibsTileUrl('MODIS_Terra_NDVI_8Day', ndviDate ?? 'default', 'png')])
      const surfaceSource = map.getSource('smapSurface') as RasterTileSource | undefined
      const rootSource = map.getSource('smapRoot') as RasterTileSource | undefined
      surfaceSource?.setTiles([gibsTileUrl('SMAP_L4_Analyzed_Surface_Soil_Moisture', surfaceSoilDate ?? 'default', 'png', 'GoogleMapsCompatible_Level6')])
      rootSource?.setTiles([gibsTileUrl('SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', rootSoilDate ?? 'default', 'png', 'GoogleMapsCompatible_Level6')])
    }
    if (map.isStyleLoaded()) updateDate()
    else map.once('load', updateDate)
  }, [imageryDate, trueColorDate, ndviDate, surfaceSoilDate, rootSoilDate])

  return <div className={`field-map-shell ${className}`}>
    <div ref={containerRef} className="field-map" role="application" aria-label={mapLabel} />
    <button className="field-map-center-action" type="button" onClick={() => {
      const center = mapRef.current?.getCenter()
      if (center) onSelectRef.current({ latitude: Number(center.lat.toFixed(5)), longitude: Number(center.lng.toFixed(5)) })
    }}>Sélectionner le centre de la carte comme point suivi</button>
    <aside className="field-map-layer-legend" aria-label="Légende des couches visibles">
      <strong className="field-map-layer-legend-title">Couches visibles</strong>
      {legendItems.map(item => <div className={`field-map-legend-item legend-${item.id}`} key={item.id}>
        <span className="field-map-legend-swatch" aria-hidden="true" />
        <span className="field-map-legend-copy"><strong>{item.label}</strong><small>{item.detail}</small>{'legendUrl' in item && <img src={item.legendUrl} alt={`Échelle de couleurs NASA GIBS · ${item.label}`} loading="lazy" />}</span>
      </div>)}
      <small className="field-map-legend-attribution">{hasNasaLayers ? 'NASA EOSDIS GIBS · couches régionales, pas des mesures de parcelle.' : 'Fond OpenStreetMap · attribution affichée sur la carte.'}</small>
    </aside>
  </div>
}
