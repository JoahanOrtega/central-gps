import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { loadGoogleMaps } from "@/lib/loadGoogleMaps"
import type { MapPoiItem } from './map.types'

export interface MapCanvasHandle {
  focusMexico: () => void
  toggleTraffic: () => void
  clearMap: () => void
  searchAddress: (address: string) => Promise<void>
  toggleFullscreen: () => void
  focusPoi: (poi: MapPoiItem) => void
}

const DEFAULT_CENTER = { lat: 23.6345, lng: -102.5528 }

export const MapCanvas = forwardRef<MapCanvasHandle>((_, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null)
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)


  const [isTrafficVisible, setIsTrafficVisible] = useState(false)

  useEffect(() => {
    const initializeMap = async () => {
      await loadGoogleMaps()

      if (!containerRef.current || !window.google?.maps) return

      const map = new window.google.maps.Map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 5,
        gestureHandling: "greedy",
        zoomControl: true,
        fullscreenControl: false,
        streetViewControl: true,
        mapTypeControl: true,
        mapTypeId: "roadmap",
      })

      mapRef.current = map
      geocoderRef.current = new window.google.maps.Geocoder()
      trafficLayerRef.current = new window.google.maps.TrafficLayer()
      infoWindowRef.current = new window.google.maps.InfoWindow()
    }

    initializeMap()
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

  const clearMap = () => {
    if (markerRef.current) {
      markerRef.current.setMap(null)
      markerRef.current = null
    }
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
        if (status === "OK" && results && results.length > 0) {
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

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        map,
        position: location,
      })
      return
    }

    markerRef.current.setPosition(location)
  }

  const focusPoi = (poi: MapPoiItem) => {
    const map = mapRef.current
    const infoWindow = infoWindowRef.current

    if (!map || !infoWindow) return
    if (poi.lat === null || poi.lng === null) return

    const position = { lat: poi.lat, lng: poi.lng }

    map.panTo(position)
    map.setZoom(17)

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        map,
        position,
      })
    } else {
      markerRef.current.setPosition(position)
    }

    const content = `
    <div style="min-width:220px; padding:4px 2px;">
      <div style="font-weight:600; font-size:14px; color:#334155;">
        ${escapeHtml(poi.nombre || 'Sin nombre')}
      </div>
      <div style="margin-top:6px; font-size:12px; color:#64748b; line-height:1.4;">
        ${escapeHtml(poi.direccion || 'Sin dirección')}
      </div>
    </div>
  `

    infoWindow.setContent(content)
    infoWindow.open({
      map,
      anchor: markerRef.current,
    })
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

MapCanvas.displayName = "MapCanvas"
const escapeHtml = (value: string) => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}