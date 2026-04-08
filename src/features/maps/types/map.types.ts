/**
 * Modelo de POI consumido por el módulo de mapas.
 * Este tipo representa la forma normalizada que el mapa espera para
 * renderizar markers, círculos o polígonos.
 */
export interface MapPoiItem {
  id_poi: number;
  nombre: string;
  direccion: string;
  lat: number | null;
  lng: number | null;
  tipo_poi: number;
  radio: number | null;
  radio_color: string | null;
  polygon_path: string;
  polygon_color: string | null;
}

/**
 * Último registro de telemetría asociado a una unidad.
 */
export interface UnitTelemetry {
  imei: string;
  fecha_hora_gps: string | null;
  latitud: number | null;
  longitud: number | null;
  velocidad: number | null;
  grados: number | null;
  status: string | null;
  voltaje?: number | null;
  voltaje_bateria?: number | null;
  odometro?: number | null;
  tipo_alerta?: number | null;
}

/**
 * Unidad que se pinta o consulta desde el mapa.
 */
export interface MapUnitItem {
  id: number;
  numero: string;
  imei: string;
  marca: string;
  modelo: string;
  telemetry: UnitTelemetry | null;
}

/**
 * Resumen general de una unidad para el panel de recorridos.
 */
export interface TripUnitSummary {
  id: number;
  numero: string;
  imei: string;
  marca: string;
  modelo: string;
  status: string;
  last_report: string | null;
  hasTelemetry: boolean;
}

/**
 * Punto individual del recorrido.
 * Cada punto corresponde a un registro real de la base de datos.
 */
export interface RoutePoint {
  id_data?: number;
  fecha_hora_gps: string;
  latitud: number;
  longitud: number;
  velocidad: number | null;
  grados: number | null;
  status: string | null;
  tipo_alerta?: number | null;
  movement_state?: "apagado" | "stop" | "movimiento" | "desconocido";
}

/**
 * Recorrido resumido para el selector de "Últimos recorridos".
 */
export interface RecentTripItem {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  distance_km: number;
}