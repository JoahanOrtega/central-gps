export interface PoiItem {
  id_poi: number
  id_empresa: number
  tipo_elemento: string
  id_elemento: number
  nombre: string
  direccion: string
  tipo_poi: number
  tipo_marker: number
  url_marker: string
  marker_path: string
  marker_color: string
  icon: string
  icon_color: string
  lat: number | null
  lng: number | null
  radio: number
  bounds: string
  area: string | null
  radio_color: string
  polygon_path: string | null
  polygon_color: string
  observaciones: string | null
  fecha_registro: string | null
  id_usuario_registro: number | null
  fecha_cambio: string | null
  id_usuario_cambio: number | null
}

export interface PoiGroupItem {
  id_grupo_pois: number
  id_empresa: number
  id_cliente: number
  nombre: string
  pois: number
  observaciones: string
  fecha_registro: string | null
  id_usuario_registro: number | null
  fecha_cambio: string | null
  id_usuario_cambio: number | null
  is_default: number
}

export interface CreatePoiPayload {
  tipo_elemento: string
  id_elemento: number
  nombre: string
  direccion: string
  direccionEsAproximada: boolean
  tipo_poi: number
  tipo_marker: number
  url_marker: string
  marker_path: string
  marker_color: string
  icon: string
  icon_color: string
  lat: number | null
  lng: number | null
  radio: number
  bounds: string
  area: string
  polygon_path: string
  polygon_color: string
  radio_color: string
  observaciones: string
  id_grupo_pois: number[]
}
export interface CreatePoiGroupPayload {
  id_cliente: number | null
  nombre: string
  observaciones: string
  is_default: number
}

// Opción del selector de clientes — usada en NewPoiGroupModal y poiService
export interface ClientOption {
  id_cliente: number
  nombre: string
}