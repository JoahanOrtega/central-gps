import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { loadGoogleMaps } from "@/lib/loadGoogleMaps"

interface PoiGeometryValue {
    tipo_poi: number
    direccion: string
    direccionEsAproximada: boolean
    lat: number | null
    lng: number | null
    radio: number
    bounds: string
    area: string
    polygon_path: string
    polygon_color: string
    radio_color: string
}

export interface PoiGeometryEditorHandle {
    clearAll: () => void
    undoLastPoint: () => void
}

interface PoiGeometryEditorProps {
    value: PoiGeometryValue
    onChange: (value: Partial<PoiGeometryValue>) => void
}

const DEFAULT_CENTER = { lat: 21.88234, lng: -102.28259 }

export const PoiGeometryEditor = forwardRef<
    PoiGeometryEditorHandle,
    PoiGeometryEditorProps
>(({ value, onChange }, ref) => {
    const mapRef = useRef<HTMLDivElement | null>(null)
    const mapInstanceRef = useRef<google.maps.Map | null>(null)
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null)
    const circleRef = useRef<google.maps.Circle | null>(null)
    const polygonRef = useRef<google.maps.Polygon | null>(null)
    const markerRef = useRef<google.maps.Marker | null>(null)
    const geocoderRef = useRef<google.maps.Geocoder | null>(null)
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        const initializeMap = async () => {
            await loadGoogleMaps()

            if (!mapRef.current || !window.google?.maps) return

            const center =
                value.lat !== null && value.lng !== null
                    ? { lat: value.lat, lng: value.lng }
                    : DEFAULT_CENTER

            const map = new window.google.maps.Map(mapRef.current, {
                center,
                zoom: 15,
                mapTypeControl: true,
                streetViewControl: true,
                fullscreenControl: true,
            })

            mapInstanceRef.current = map
            geocoderRef.current = new window.google.maps.Geocoder()

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
                    radius: value.radio || 50,
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

            drawingManager.addListener("circlecomplete", async (circle) => {
                clearPolygon(false)
                clearCircle(false)

                circleRef.current = circle
                drawingManager.setDrawingMode(null)

                attachCircleEvents(circle)
                await updateCircleState(circle)
            })

            drawingManager.addListener("polygoncomplete", async (polygon) => {
                const path = polygon.getPath()

                if (path.getLength() < 3) {
                    polygon.setMap(null)
                    return
                }

                clearCircle(false)
                clearPolygon(false)

                polygonRef.current = polygon
                drawingManager.setDrawingMode(null)

                attachPolygonEvents(polygon)
                await updatePolygonState(polygon)
            })

            if (value.tipo_poi === 1 && value.lat !== null && value.lng !== null) {
                const circle = new window.google.maps.Circle({
                    map,
                    center: { lat: value.lat, lng: value.lng },
                    radius: value.radio || 50,
                    fillColor: value.radio_color || "#5e6383",
                    fillOpacity: 0.25,
                    strokeColor: value.radio_color || "#5e6383",
                    strokeWeight: 2,
                    editable: true,
                    draggable: true,
                })

                circleRef.current = circle
                attachCircleEvents(circle)
                setMarker(circle.getCenter()!)
            }

            if (value.tipo_poi === 2 && value.polygon_path) {
                const parsedPoints = safeParsePolygon(value.polygon_path)

                if (parsedPoints.length >= 3) {
                    const polygon = new window.google.maps.Polygon({
                        map,
                        paths: parsedPoints,
                        fillColor: value.polygon_color || "#5e6383",
                        fillOpacity: 0.25,
                        strokeColor: value.polygon_color || "#5e6383",
                        strokeWeight: 2,
                        editable: true,
                        draggable: true,
                    })

                    polygonRef.current = polygon
                    attachPolygonEvents(polygon)

                    const bounds = new window.google.maps.LatLngBounds()
                    parsedPoints.forEach((point) => bounds.extend(point))
                    map.fitBounds(bounds)
                    setMarker(bounds.getCenter())
                }
            }

            setTimeout(() => {
                window.google.maps.event.trigger(map, "resize")
                map.setCenter(center)
            }, 250)

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

    useEffect(() => {
        if (circleRef.current && value.tipo_poi === 1) {
            circleRef.current.setRadius(value.radio || 50)
            updateCircleState(circleRef.current)
        }
    }, [value.radio])

    useEffect(() => {
        const debounce = setTimeout(() => {
            handleAddressSearch()
        }, 700)

        return () => clearTimeout(debounce)
    }, [value.direccion])

    const reverseGeocode = async (
        lat: number,
        lng: number,
    ): Promise<string | null> => {
        const geocoder = geocoderRef.current
        if (!geocoder) return null

        return new Promise((resolve) => {
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === "OK" && results && results.length > 0) {
                    resolve(results[0].formatted_address)
                    return
                }

                resolve(null)
            })
        })
    }

    const geocodeAddress = async (
        address: string,
    ): Promise<{ lat: number; lng: number; formattedAddress: string } | null> => {
        const geocoder = geocoderRef.current
        if (!geocoder || !address.trim()) return null

        return new Promise((resolve) => {
            geocoder.geocode({ address }, (results, status) => {
                if (
                    status === "OK" &&
                    results &&
                    results.length > 0 &&
                    results[0].geometry.location
                ) {
                    const location = results[0].geometry.location

                    resolve({
                        lat: location.lat(),
                        lng: location.lng(),
                        formattedAddress: results[0].formatted_address,
                    })
                    return
                }

                resolve(null)
            })
        })
    }

    const handleAddressSearch = async () => {
        const map = mapInstanceRef.current
        if (!map || !value.direccion.trim()) return

        const result = await geocodeAddress(value.direccion)
        if (!result) return

        map.panTo({ lat: result.lat, lng: result.lng })
        map.setZoom(17)

        if (value.tipo_poi === 1) {
            clearPolygon(false)
            clearCircle(false)

            const circle = new window.google.maps.Circle({
                map,
                center: { lat: result.lat, lng: result.lng },
                radius: value.radio || 50,
                fillColor: value.radio_color || "#5e6383",
                fillOpacity: 0.25,
                strokeColor: value.radio_color || "#5e6383",
                strokeWeight: 2,
                editable: true,
                draggable: true,
            })

            circleRef.current = circle
            attachCircleEvents(circle)
            setMarker(circle.getCenter()!)

            onChange({
                lat: result.lat,
                lng: result.lng,
                direccion: result.formattedAddress,
                direccionEsAproximada: false,
            })

            await updateCircleState(circle)
        }
    }

    const attachCircleEvents = (circle: google.maps.Circle) => {
        circle.addListener("radius_changed", () => {
            void updateCircleState(circle)
        })

        circle.addListener("center_changed", () => {
            void updateCircleState(circle)
        })

        circle.addListener("dragend", () => {
            void updateCircleState(circle)
        })
    }

    const attachPolygonEvents = (polygon: google.maps.Polygon) => {
        polygon.addListener("dragend", () => {
            void updatePolygonState(polygon)
        })

        const path = polygon.getPath()
        path.addListener("insert_at", () => {
            void updatePolygonState(polygon)
        })
        path.addListener("set_at", () => {
            void updatePolygonState(polygon)
        })
        path.addListener("remove_at", () => {
            void updatePolygonState(polygon)
        })
    }

    const updateCircleState = async (circle: google.maps.Circle) => {
        const center = circle.getCenter()
        const bounds = circle.getBounds()

        if (!center || !bounds) return

        const address = await reverseGeocode(center.lat(), center.lng())

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
            direccion: address || value.direccion,
            direccionEsAproximada: false,
        })

        setMarker(center)
    }

    const updatePolygonState = async (polygon: google.maps.Polygon) => {
        const path = polygon.getPath()

        if (path.getLength() < 3) return

        const points = path.getArray().map((point: google.maps.LatLng) => ({
            lat: point.lat(),
            lng: point.lng(),
        }))

        const bounds = new window.google.maps.LatLngBounds()
        points.forEach((point) => bounds.extend(point))

        const center = bounds.getCenter()
        const area = window.google.maps.geometry.spherical.computeArea(path)
        const address = await reverseGeocode(center.lat(), center.lng())

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
            direccion: address || value.direccion,
            direccionEsAproximada: true,
        })

        setMarker(center)
    }

    const setMarker = (
        position: google.maps.LatLng | google.maps.LatLngLiteral,
    ) => {
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
        clearCircle(false)
        clearPolygon(false)

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
            direccion: "",
            direccionEsAproximada: false,
        })
    }

    const undoLastPoint = () => {
        if (value.tipo_poi !== 2 || !polygonRef.current) return

        const path = polygonRef.current.getPath()
        const length = path.getLength()

        if (length === 0) return

        path.removeAt(length - 1)

        if (path.getLength() < 3) {
            clearPolygon(false)

            onChange({
                polygon_path: "",
                bounds: "",
                area: "",
                direccionEsAproximada: true,
            })

            return
        }

        void updatePolygonState(polygonRef.current)
    }

    useImperativeHandle(ref, () => ({
        clearAll,
        undoLastPoint,
    }))

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                    {value.tipo_poi === 1
                        ? "Haz click en el mapa para crear o mover el círculo."
                        : "Dibuja el polígono en el mapa con al menos 3 puntos."}
                </p>
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
})

const safeParsePolygon = (polygonPath: string) => {
    try {
        const parsed = JSON.parse(polygonPath)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

PoiGeometryEditor.displayName = "PoiGeometryEditor"