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