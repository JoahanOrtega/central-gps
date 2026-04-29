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

// ─── UpdatePoiPayload ─────────────────────────────────────────────────────────
// Payload del PATCH /pois/<id>. TODOS los campos son opcionales — el cliente
// solo manda los que cambiaron. Esto refleja el contrato del backend con
// UpdatePoiSchema, que NO inyecta defaults: los campos omitidos no entran al
// UPDATE SQL.
//
// Por qué NO usar Partial<CreatePoiPayload>:
//   `direccionEsAproximada` es un flag de UI (no se persiste en BD).
//   `id_grupo_pois` puede ser undefined (no tocar grupos) o [] (desasignar
//   todos), distinto del Partial standard. Definirlo explícitamente hace
//   visible esa semántica al lector.
export interface UpdatePoiPayload {
  // Datos básicos editables
  nombre?: string
  direccion?: string | null
  observaciones?: string | null

  // Geometría — modificable solo si el modal lo permite
  tipo_poi?: number
  lat?: number | null
  lng?: number | null
  radio?: number | null
  polygon_path?: string | null
  bounds?: string | null
  area?: number | null

  // Apariencia
  tipo_marker?: number
  url_marker?: string | null
  marker_path?: string | null
  marker_color?: string
  icon?: string | null
  icon_color?: string
  radio_color?: string
  polygon_color?: string

  // Grupos — undefined = no tocar; [] = desasignar todos
  id_grupo_pois?: number[]
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