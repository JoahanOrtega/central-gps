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

// mapId requerido por AdvancedMarkerElement.
const MAP_ID = "DEMO_MAP_ID"

export const PoiGeometryEditor = forwardRef<
    PoiGeometryEditorHandle,
    PoiGeometryEditorProps
>(({ value, onChange }, ref) => {
    const mapRef = useRef<HTMLDivElement | null>(null)
    const mapInstanceRef = useRef<google.maps.Map | null>(null)
    const circleRef = useRef<google.maps.Circle | null>(null)
    const polygonRef = useRef<google.maps.Polygon | null>(null)
    // AdvancedMarkerElement en lugar del deprecado google.maps.Marker.
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
    const geocoderRef = useRef<google.maps.Geocoder | null>(null)
    // Listener del clic en el mapa (sustituye al DrawingManager). Se guarda para
    // limpiarlo al desmontar.
    const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null)
    // Mantiene el tipo_poi vigente accesible dentro del listener de clic, que se
    // registra una sola vez. Sin esto, el listener capturaría el tipo_poi del
    // primer render (closure obsoleto).
    const tipoPoiRef = useRef<number>(value.tipo_poi)
    const [isReady, setIsReady] = useState(false)

    // Sincroniza el ref del tipo con el value en cada cambio.
    useEffect(() => {
        tipoPoiRef.current = value.tipo_poi
    }, [value.tipo_poi])

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
                mapId: MAP_ID, // requerido por AdvancedMarkerElement
                mapTypeControl: true,
                streetViewControl: true,
                fullscreenControl: true,
            })

            mapInstanceRef.current = map
            geocoderRef.current = new window.google.maps.Geocoder()

            // Importar solo geometry y marker. La librería "drawing" quedó
            // decomisionada por Google (mayo 2026): el dibujo de geocercas ahora
            // se hace capturando clics del mapa, no con DrawingManager.
            await window.google.maps.importLibrary("geometry")
            await window.google.maps.importLibrary("marker")

            // ── Sustituto del DrawingManager: clic en el mapa para dibujar ──
            // Círculo: cada clic posiciona/mueve el círculo en ese punto.
            // Polígono: cada clic agrega un vértice al path.
            mapClickListenerRef.current = map.addListener(
                "click",
                (event: google.maps.MapMouseEvent) => {
                    if (!event.latLng) return
                    if (tipoPoiRef.current === 1) {
                        void handleCircleMapClick(event.latLng)
                    } else {
                        void handlePolygonMapClick(event.latLng)
                    }
                },
            )

            // Repintar geometría existente al abrir en modo edición.
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

        // Limpiar el listener de clic al desmontar.
        return () => {
            if (mapClickListenerRef.current) {
                mapClickListenerRef.current.remove()
                mapClickListenerRef.current = null
            }
        }
    }, [])

    // Al cambiar el tipo de geocerca, limpiar la geometría del otro tipo.
    // El listener de clic ya reacciona al tipo vigente vía tipoPoiRef.
    useEffect(() => {
        if (!mapInstanceRef.current) return

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

    // Pinta la geocerca cuando los datos llegan despues de montar el mapa.
    useEffect(() => {
        const map = mapInstanceRef.current
        if (
            !isReady ||
            !map ||
            value.tipo_poi !== 1 ||
            value.lat === null ||
            value.lng === null ||
            circleRef.current
        ) {
            return
        }

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
        map.setCenter({ lat: value.lat, lng: value.lng })
    }, [isReady, value.lat, value.lng, value.tipo_poi])

    useEffect(() => {
        const debounce = setTimeout(() => {
            handleAddressSearch()
        }, 700)

        return () => clearTimeout(debounce)
    }, [value.direccion])

    // ── Dibujo por clics ───────────────────────

    // Círculo: el clic crea el círculo si no existe, o lo recoloca si ya existe.
    const handleCircleMapClick = async (latLng: google.maps.LatLng) => {
        const map = mapInstanceRef.current
        if (!map) return

        if (circleRef.current) {
            // Ya hay círculo: moverlo al punto clicado.
            circleRef.current.setCenter(latLng)
            await updateCircleState(circleRef.current)
            return
        }

        const circle = new window.google.maps.Circle({
            map,
            center: latLng,
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
        await updateCircleState(circle)
    }

    // Polígono: cada clic agrega un vértice. Con <3 vértices aún no es válido,
    // pero se va dibujando; al llegar a 3 se materializa el estado.
    const handlePolygonMapClick = async (latLng: google.maps.LatLng) => {
        const map = mapInstanceRef.current
        if (!map) return

        if (!polygonRef.current) {
            // Primer vértice: crear el polígono con un solo punto.
            const polygon = new window.google.maps.Polygon({
                map,
                paths: [latLng],
                fillColor: value.polygon_color || "#5e6383",
                fillOpacity: 0.25,
                strokeColor: value.polygon_color || "#5e6383",
                strokeWeight: 2,
                editable: true,
                draggable: true,
            })
            polygonRef.current = polygon
            attachPolygonEvents(polygon)
            return
        }

        // Agregar vértice al path existente.
        polygonRef.current.getPath().push(latLng)

        if (polygonRef.current.getPath().getLength() >= 3) {
            await updatePolygonState(polygonRef.current)
        }
    }

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
            markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
                map,
                position,
            })
            return
        }

        markerRef.current.position = position
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
            // AdvancedMarkerElement se quita poniendo map en null.
            markerRef.current.map = null
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
                        : "Haz click en el mapa para agregar cada punto del polígono (mínimo 3)."}
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