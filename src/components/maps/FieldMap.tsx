import { useEffect, useRef } from 'react'
import { Map as MapLibreMap, RasterTileSource, ScaleControl, type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { GeoPoint } from '../../lib/geo/location'
import './field-map.css'

export type MapBaseLayer = 'streets' | 'nasa'

type Props = {
  center: GeoPoint
  selectedPoint: GeoPoint
  baseLayer: MapBaseLayer
  showNdvi: boolean
  showSurfaceSoil?: boolean
  showRootSoil?: boolean
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

export function FieldMap({ center, selectedPoint, baseLayer, showNdvi, showSurfaceSoil = false, showRootSoil = false, imageryDate, onPointSelect, onMapReady, className = '', ariaLabel = 'Carte interactive FieldNova' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
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
            tiles: [gibsTileUrl('MODIS_Terra_CorrectedReflectance_TrueColor', imageryDate, 'jpg')],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 9,
            attribution: NASA_ATTRIBUTION,
          },
          nasaNdvi: {
            type: 'raster',
            tiles: [gibsTileUrl('MODIS_Terra_NDVI_8Day', imageryDate, 'png')],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 9,
            attribution: NASA_ATTRIBUTION,
          },
          smapSurface: {
            type: 'raster',
            tiles: [gibsTileUrl('SMAP_L4_Analyzed_Surface_Soil_Moisture', 'default', 'png', 'GoogleMapsCompatible_Level6')],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 6,
            attribution: NASA_ATTRIBUTION,
          },
          smapRoot: {
            type: 'raster',
            tiles: [gibsTileUrl('SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', 'default', 'png', 'GoogleMapsCompatible_Level6')],
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
        },
        layers: [
          { id: 'osm-streets', type: 'raster', source: 'osm', layout: { visibility: 'visible' } },
          { id: 'nasa-truecolor', type: 'raster', source: 'nasaTrueColor', layout: { visibility: baseLayer === 'nasa' ? 'visible' : 'none' }, paint: { 'raster-opacity': 1 } },
          { id: 'nasa-ndvi', type: 'raster', source: 'nasaNdvi', layout: { visibility: showNdvi ? 'visible' : 'none' }, paint: { 'raster-opacity': 0.82 } },
          { id: 'smap-surface-soil', type: 'raster', source: 'smapSurface', layout: { visibility: showSurfaceSoil ? 'visible' : 'none' }, paint: { 'raster-opacity': 0.56 } },
          { id: 'smap-root-soil', type: 'raster', source: 'smapRoot', layout: { visibility: showRootSoil ? 'visible' : 'none' }, paint: { 'raster-opacity': 0.56 } },
          { id: 'selected-point-halo', type: 'circle', source: 'selectedPoint', paint: { 'circle-radius': 10, 'circle-color': '#fffefa', 'circle-opacity': 0.9 } },
          { id: 'selected-point', type: 'circle', source: 'selectedPoint', paint: { 'circle-radius': 5, 'circle-color': '#286b45', 'circle-stroke-color': '#fffefa', 'circle-stroke-width': 2 } },
        ],
      },
    })
    mapRef.current = map
    map.addControl(new ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-right')
    map.on('load', () => onReadyRef.current?.(map))
    map.on('click', (event: MapMouseEvent) => onSelectRef.current({ latitude: Number(event.lngLat.lat.toFixed(5)), longitude: Number(event.lngLat.lng.toFixed(5)) }))
    map.on('error', event => {
      if (event.error) console.warn('FieldNova map tile error:', event.error.message)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // The map is initialized once; source, marker, and visibility changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    const updateDate = () => {
      const trueSource = map.getSource('nasaTrueColor') as RasterTileSource | undefined
      const ndviSource = map.getSource('nasaNdvi') as RasterTileSource | undefined
      trueSource?.setTiles([gibsTileUrl('MODIS_Terra_CorrectedReflectance_TrueColor', imageryDate, 'jpg')])
      ndviSource?.setTiles([gibsTileUrl('MODIS_Terra_NDVI_8Day', imageryDate, 'png')])
    }
    if (map.isStyleLoaded()) updateDate()
    else map.once('load', updateDate)
  }, [imageryDate])

  return <div ref={containerRef} className={`field-map ${className}`} role="application" aria-label={ariaLabel} />
}
