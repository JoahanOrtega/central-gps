import { useEffect, useRef, useState } from "react"
import { loadGoogleMaps } from "@/lib/loadGoogleMaps"

interface PoiGeometryValue {
    tipo_poi: number
    lat: number | null
    lng: number | null
    radio: number
    bounds: string
    area: string
    polygon_path: string
    polygon_color: string
    radio_color: string
}

interface PoiGeometryEditorProps {
    value: PoiGeometryValue
    onChange: (value: Partial<PoiGeometryValue>) => void
}

const DEFAULT_CENTER = { lat: 21.88234, lng: -102.28259 }

export const PoiGeometryEditor = ({
    value,
    onChange,
}: PoiGeometryEditorProps) => {
    const mapRef = useRef<HTMLDivElement | null>(null)
    const mapInstanceRef = useRef<google.maps.Map | null>(null)
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null)
    const circleRef = useRef<google.maps.Circle | null>(null)
    const polygonRef = useRef<google.maps.Polygon | null>(null)
    const markerRef = useRef<google.maps.Marker | null>(null)
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        const initializeMap = async () => {
            await loadGoogleMaps()

            if (!mapRef.current || !window.google?.maps) return

            const map = new window.google.maps.Map(mapRef.current, {
                center:
                    value.lat && value.lng
                        ? { lat: value.lat, lng: value.lng }
                        : DEFAULT_CENTER,
                zoom: 14,
                mapTypeControl: true,
                streetViewControl: true,
                fullscreenControl: true,
            })

            mapInstanceRef.current = map

            const drawingLibrary = await window.google.maps.importLibrary("drawing")
            await window.google.maps.importLibrary("geometry")

            const drawingManager = new (
                drawingLibrary as google.maps.DrawingLibrary
            ).DrawingManager({
                drawingMode:
                    value.tipo_poi === 1
                        ? window.google.maps.drawing.OverlayType.CIRCLE
                        : window.google.maps.drawing.OverlayType.POLYGON,
                drawingControl: false,
                circleOptions: {
                    fillColor: value.radio_color || "#5e6383",
                    fillOpacity: 0.25,
                    strokeColor: value.radio_color || "#5e6383",
                    strokeWeight: 2,
                    editable: true,
                    draggable: true,
                },
                polygonOptions: {
                    fillColor: value.polygon_color || "#5e6383",
                    fillOpacity: 0.25,
                    strokeColor: value.polygon_color || "#5e6383",
                    strokeWeight: 2,
                    editable: true,
                    draggable: true,
                },
            })

            drawingManager.setMap(map)
            drawingManagerRef.current = drawingManager

            setIsReady(true)
        }

        initializeMap()
    }, [])

    useEffect(() => {
        const drawingManager = drawingManagerRef.current
        if (!drawingManager) return

        drawingManager.setDrawingMode(
            value.tipo_poi === 1
                ? window.google.maps.drawing.OverlayType.CIRCLE
                : window.google.maps.drawing.OverlayType.POLYGON,
        )

        if (value.tipo_poi === 1) {
            clearPolygon()
        } else {
            clearCircle()
        }
    }, [value.tipo_poi])

    useEffect(() => {
        if (circleRef.current) {
            circleRef.current.setOptions({
                fillColor: value.radio_color || "#5e6383",
                strokeColor: value.radio_color || "#5e6383",
            })
        }
    }, [value.radio_color])

    useEffect(() => {
        if (polygonRef.current) {
            polygonRef.current.setOptions({
                fillColor: value.polygon_color || "#5e6383",
                strokeColor: value.polygon_color || "#5e6383",
            })
        }
    }, [value.polygon_color])

    const attachCircleEvents = (circle: google.maps.Circle) => {
        circle.addListener("radius_changed", () => updateCircleState(circle))
        circle.addListener("center_changed", () => updateCircleState(circle))
        circle.addListener("dragend", () => updateCircleState(circle))
    }

    const attachPolygonEvents = (polygon: google.maps.Polygon) => {
        polygon.addListener("dragend", () => updatePolygonState(polygon))

        const path = polygon.getPath()
        path.addListener("insert_at", () => updatePolygonState(polygon))
        path.addListener("set_at", () => updatePolygonState(polygon))
        path.addListener("remove_at", () => updatePolygonState(polygon))
    }

    const updateCircleState = (circle: google.maps.Circle) => {
        const center = circle.getCenter()
        const bounds = circle.getBounds()

        if (!center || !bounds) return

        onChange({
            lat: center.lat(),
            lng: center.lng(),
            radio: Math.round(circle.getRadius()),
            bounds: JSON.stringify({
                south: bounds.getSouthWest().lat(),
                west: bounds.getSouthWest().lng(),
                north: bounds.getNorthEast().lat(),
                east: bounds.getNorthEast().lng(),
            }),
            area: String(Math.round(Math.PI * Math.pow(circle.getRadius(), 2))),
            polygon_path: "",
        })

        setMarker(center)
    }

    const updatePolygonState = (polygon: google.maps.Polygon) => {
        const path = polygon.getPath()
        const points = path.getArray().map((point) => ({
            lat: point.lat(),
            lng: point.lng(),
        }))

        const bounds = new window.google.maps.LatLngBounds()
        points.forEach((point) => bounds.extend(point))

        const center = bounds.getCenter()

        const area = window.google.maps.geometry.spherical.computeArea(path)

        onChange({
            lat: center.lat(),
            lng: center.lng(),
            bounds: JSON.stringify({
                south: bounds.getSouthWest().lat(),
                west: bounds.getSouthWest().lng(),
                north: bounds.getNorthEast().lat(),
                east: bounds.getNorthEast().lng(),
            }),
            polygon_path: JSON.stringify(points),
            area: String(Math.round(area)),
        })

        setMarker(center)
    }

    const setMarker = (position: google.maps.LatLng | google.maps.LatLngLiteral) => {
        const map = mapInstanceRef.current
        if (!map) return

        if (!markerRef.current) {
            markerRef.current = new window.google.maps.Marker({
                map,
                position,
            })
            return
        }

        markerRef.current.setPosition(position)
    }

    const clearCircle = (clearValues = true) => {
        if (circleRef.current) {
            circleRef.current.setMap(null)
            circleRef.current = null
        }

        if (clearValues) {
            onChange({
                lat: null,
                lng: null,
                bounds: "",
                area: "",
            })
        }
    }

    const clearPolygon = (clearValues = true) => {
        if (polygonRef.current) {
            polygonRef.current.setMap(null)
            polygonRef.current = null
        }

        if (clearValues) {
            onChange({
                polygon_path: "",
                area: "",
            })
        }
    }

    const clearAll = () => {
        clearCircle()
        clearPolygon()
        if (markerRef.current) {
            markerRef.current.setMap(null)
            markerRef.current = null
        }
        onChange({
            lat: null,
            lng: null,
            radio: 50,
            bounds: "",
            area: "",
            polygon_path: "",
        })
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                    {value.tipo_poi === 1
                        ? "Haz click en el mapa para crear o mover el círculo."
                        : "Dibuja el polígono en el mapa."}
                </p>

                <button
                    type="button"
                    onClick={clearAll}
                    className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                >
                    Limpiar geometría
                </button>
            </div>

            <div
                ref={mapRef}
                className="h-[360px] w-full rounded border border-slate-300"
            />

            {isReady && (
                <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div>
                        <span className="font-medium">Lat:</span> {value.lat ?? "---"}
                    </div>
                    <div>
                        <span className="font-medium">Lng:</span> {value.lng ?? "---"}
                    </div>
                    <div>
                        <span className="font-medium">Radio:</span> {value.radio ?? "---"}
                    </div>
                    <div>
                        <span className="font-medium">Área:</span> {value.area || "---"}
                    </div>
                </div>
            )}
        </div>
    )
}