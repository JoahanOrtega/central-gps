export interface MapPoiItem {
  id_poi: number
  nombre: string
  direccion: string
  lat: number | null
  lng: number | null
  tipo_poi: number
  radio: number | null
  radio_color: string | null
  polygon_path: string
  polygon_color: string | null
}

export interface MapUnitItem {
  id: number
  numero: string
  imei: string
  marca: string
  modelo: string
  telemetry: {
    imei: string
    fecha_hora_gps: string | null
    latitud: number | null
    longitud: number | null
    velocidad: number | null
    grados: number | null
    status: string | null
    voltaje?: number | null
    voltaje_bateria?: number | null
    odometro?: number | null
    tipo_alerta?: number | null
  } | null
}

export interface TripUnitSummary {
  id: number
  numero: string
  imei: string
  marca: string
  modelo: string
  status: string
  last_report: string | null
  hasTelemetry: boolean
}

export interface RoutePoint {
  fecha_hora_gps: string
  latitud: number
  longitud: number
  velocidad: number | null
  grados: number | null
  status: string | null
  movement_state?: "apagado" | "stop" | "movimiento" | "desconocido"
}

export interface RecentTripItem {
  id: string
  label: string
  start_time: string
  end_time: string
  duration_seconds: number
  distance_km: number
}