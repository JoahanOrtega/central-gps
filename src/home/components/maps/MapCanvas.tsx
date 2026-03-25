import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { loadGoogleMaps } from '@/lib/loadGoogleMaps'
import type { MapPoiItem } from './map.types'

export interface MapCanvasHandle {
  focusMexico: () => void
  toggleTraffic: () => void
  clearMap: () => void
  searchAddress: (address: string) => Promise<void>
  toggleFullscreen: () => void
  focusPoi: (poi: MapPoiItem) => void
  showPois: (pois: MapPoiItem[]) => void
  hidePois: () => void
}

const DEFAULT_CENTER = { lat: 23.6345, lng: -102.5528 }

export const MapCanvas = forwardRef<MapCanvasHandle>((_, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const searchMarkerRef = useRef<google.maps.Marker | null>(null)
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null)
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const poiMarkersRef = useRef<Map<number, google.maps.Marker>>(new Map())
  const poiCirclesRef = useRef<Map<number, google.maps.Circle>>(new Map())
  const poiPolygonsRef = useRef<Map<number, google.maps.Polygon>>(new Map())

  const [isTrafficVisible, setIsTrafficVisible] = useState(false)

  useEffect(() => {
    const initializeMap = async () => {
      await loadGoogleMaps()

      if (!containerRef.current || !window.google?.maps) return

      const map = new window.google.maps.Map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 5,
        gestureHandling: 'greedy',
        zoomControl: true,
        fullscreenControl: false,
        streetViewControl: true,
        mapTypeControl: true,
        mapTypeId: 'roadmap',
      })

      mapRef.current = map
      geocoderRef.current = new window.google.maps.Geocoder()
      trafficLayerRef.current = new window.google.maps.TrafficLayer()
      infoWindowRef.current = new window.google.maps.InfoWindow()
    }

    void initializeMap()
  }, [])

  const focusMexico = () => {
    const map = mapRef.current
    if (!map) return

    map.panTo(DEFAULT_CENTER)
    map.setZoom(5)
  }

  const toggleTraffic = () => {
    const map = mapRef.current
    const trafficLayer = trafficLayerRef.current

    if (!map || !trafficLayer) return

    if (isTrafficVisible) {
      trafficLayer.setMap(null)
      setIsTrafficVisible(false)
      return
    }

    trafficLayer.setMap(map)
    setIsTrafficVisible(true)
  }

  const clearSearchMarker = () => {
    if (searchMarkerRef.current) {
      searchMarkerRef.current.setMap(null)
      searchMarkerRef.current = null
    }
  }

  const clearPoisMarkers = () => {
    poiMarkersRef.current.forEach((marker) => {
      marker.setMap(null)
    })
    poiMarkersRef.current.clear()
  }

  const clearPoiGeometry = () => {
    poiCirclesRef.current.forEach((circle) => {
      circle.setMap(null)
    })
    poiCirclesRef.current.clear()

    poiPolygonsRef.current.forEach((polygon) => {
      polygon.setMap(null)
    })
    poiPolygonsRef.current.clear()
  }
  const clearMap = () => {
    clearSearchMarker()
    clearPoisMarkers()
    clearPoiGeometry()

    if (infoWindowRef.current) {
      infoWindowRef.current.close()
    }
  }

  const searchAddress = async (address: string) => {
    const map = mapRef.current
    const geocoder = geocoderRef.current

    if (!map || !geocoder || !address.trim()) return

    const result = await new Promise<google.maps.GeocoderResult | null>((resolve) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          resolve(results[0])
          return
        }

        resolve(null)
      })
    })

    if (!result || !result.geometry.location) return

    const location = result.geometry.location

    map.panTo(location)
    map.setZoom(16)

    if (!searchMarkerRef.current) {
      searchMarkerRef.current = new window.google.maps.Marker({
        map,
        position: location,
      })
      return
    }

    searchMarkerRef.current.setPosition(location)
  }

  const buildInfoWindowContent = (poi: MapPoiItem) => {
    return `
      <div style="min-width:220px; padding:4px 2px;">
        <div style="font-weight:600; font-size:14px; color:#334155;">
          ${escapeHtml(poi.nombre || 'Sin nombre')}
        </div>
        <div style="margin-top:6px; font-size:12px; color:#64748b; line-height:1.4;">
          ${escapeHtml(poi.direccion || 'Sin dirección')}
        </div>
      </div>
    `
  }

  const parsePolygonPath = (polygonPath: string) => {
    try {
      const parsed = JSON.parse(polygonPath)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const drawSinglePoiGeometry = (poi: MapPoiItem) => {
    const map = mapRef.current
    if (!map) return
    if (poi.lat === null || poi.lng === null) return

    if (poi.tipo_poi === 1) {
      const existingCircle = poiCirclesRef.current.get(poi.id_poi)
      if (existingCircle) {
        existingCircle.setMap(null)
        poiCirclesRef.current.delete(poi.id_poi)
      }

      const circle = new window.google.maps.Circle({
        map,
        center: { lat: poi.lat, lng: poi.lng },
        radius: poi.radio || 50,
        fillColor: poi.radio_color || '#5e6383',
        fillOpacity: 0.2,
        strokeColor: poi.radio_color || '#5e6383',
        strokeOpacity: 0.9,
        strokeWeight: 2,
      })

      poiCirclesRef.current.set(poi.id_poi, circle)
      return
    }

    if (poi.tipo_poi === 2) {
      const points = parsePolygonPath(poi.polygon_path)
      if (points.length < 3) return

      const existingPolygon = poiPolygonsRef.current.get(poi.id_poi)
      if (existingPolygon) {
        existingPolygon.setMap(null)
        poiPolygonsRef.current.delete(poi.id_poi)
      }

      const polygon = new window.google.maps.Polygon({
        map,
        paths: points,
        fillColor: poi.polygon_color || '#5e6383',
        fillOpacity: 0.2,
        strokeColor: poi.polygon_color || '#5e6383',
        strokeOpacity: 0.9,
        strokeWeight: 2,
      })

      poiPolygonsRef.current.set(poi.id_poi, polygon)
    }
  }

  const drawPoisGeometries = (pois: MapPoiItem[]) => {
    clearPoiGeometry()

    pois.forEach((poi) => {
      drawSinglePoiGeometry(poi)
    })
  }

  const focusPoi = (poi: MapPoiItem) => {
    const map = mapRef.current
    const infoWindow = infoWindowRef.current

    if (!map || !infoWindow) return
    if (poi.lat === null || poi.lng === null) return

    const position = { lat: poi.lat, lng: poi.lng }

    map.panTo(position)
    map.setZoom(17)

    const existingMarker = poiMarkersRef.current.get(poi.id_poi)

    if (existingMarker) {
      infoWindow.setContent(buildInfoWindowContent(poi))
      infoWindow.open({
        map,
        anchor: existingMarker,
      })
      return
    }

    const marker = new window.google.maps.Marker({
      map,
      position,
      title: poi.nombre,
    })

    marker.addListener('click', () => {
      infoWindow.setContent(buildInfoWindowContent(poi))
      infoWindow.open({
        map,
        anchor: marker,
      })
    })

    poiMarkersRef.current.set(poi.id_poi, marker)

    infoWindow.setContent(buildInfoWindowContent(poi))
    infoWindow.open({
      map,
      anchor: marker,
    })
  }

  const showPois = (pois: MapPoiItem[]) => {
    const map = mapRef.current
    const infoWindow = infoWindowRef.current

    if (!map || !infoWindow) return

    clearPoisMarkers()
    clearPoiGeometry()

    const bounds = new window.google.maps.LatLngBounds()
    let hasValidPoints = false

    pois.forEach((poi) => {
      if (poi.lat === null || poi.lng === null) return

      const position = { lat: poi.lat, lng: poi.lng }

      const marker = new window.google.maps.Marker({
        map,
        position,
        title: poi.nombre,
      })

      marker.addListener('click', () => {
        infoWindow.setContent(buildInfoWindowContent(poi))
        infoWindow.open({
          map,
          anchor: marker,
        })
      })

      poiMarkersRef.current.set(poi.id_poi, marker)
      bounds.extend(position)
      hasValidPoints = true
    })

    drawPoisGeometries(pois)

    if (hasValidPoints) {
      map.fitBounds(bounds)

      const zoom = map.getZoom()
      if (typeof zoom === 'number' && zoom > 17) {
        map.setZoom(17)
      }
    }
  }

  const hidePois = () => {
    clearPoisMarkers()
    clearPoiGeometry()

    if (infoWindowRef.current) {
      infoWindowRef.current.close()
    }
  }

  const toggleFullscreen = () => {
    const element = containerRef.current
    if (!element) return

    if (!document.fullscreenElement) {
      void element.requestFullscreen()
      return
    }

    void document.exitFullscreen()
  }

  useImperativeHandle(ref, () => ({
    focusMexico,
    toggleTraffic,
    clearMap,
    searchAddress,
    toggleFullscreen,
    focusPoi,
    showPois,
    hidePois,
  }))

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      <div className="absolute left-4 top-4 z-10">
        <select className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none">
          <option value="roadmap">Mapa</option>
        </select>
      </div>

      <div className="absolute left-4 top-20 z-10 flex flex-col gap-3">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          title="Pantalla completa"
          onClick={toggleFullscreen}
        >
          ⛶
        </button>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          title="Street View"
        >
          🚶
        </button>
      </div>

      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
})

MapCanvas.displayName = 'MapCanvas'

const escapeHtml = (value: string) => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}