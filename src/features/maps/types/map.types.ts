// ── Tipos del módulo de mapas ─────────────────────────────────────────────────
//
// Estos tipos reflejan fielmente los campos que devuelven los endpoints
// del backend Flask, que a su vez están modelados sobre las tablas del
// PHP legacy (t_unidades + t_data + t_pois + t_rutas).

// ── POI ───────────────────────────────────────────────────────────────────────

/**
 * Punto de interés consumido por el módulo de mapas.
 * Los campos de geometría vienen de t_pois en el backend.
 */
export interface MapPoiItem {
  id_poi: number;
  nombre: string;
  direccion: string;
  lat: number | null;
  lng: number | null;
  tipo_poi: number;       // 1=círculo, 2=polígono
  radio: number | null;
  radio_color: string | null;
  polygon_path: string;       // JSON array de {lat, lng}
  polygon_color: string | null;
  // Apariencia del marker
  tipo_marker: number | null;   // 1=imagen URL, 2=path SVG
  url_marker: string | null;
  marker_path: string | null;
  marker_color: string | null;
  icon: string | null;
  icon_color: string | null;
  observaciones: string | null;
}

// ── Telemetría ────────────────────────────────────────────────────────────────

/**
 * Último registro de t_data asociado a una unidad.
 *
 * Campos clave:
 *   status     - 9 bits: bit1=ignición, bits2-5=inputs, bits6-9=outputs
 *   grados     - dirección del vehículo en grados (0-360, donde 0=Norte)
 *   segundos   - tiempo transcurrido desde fecha_hora_gps hasta NOW() en BD
 *   segundos_sistema - tiempo desde fecha_hora_sistema (para detectar rebote)
 */
export interface UnitTelemetry {
  imei: string;
  fecha_hora_gps: string | null;   // UTC desde BD — usar date-time.ts
  latitud: number | null;
  longitud: number | null;
  velocidad: number | null;
  grados: number | null;   // dirección real del dispositivo AVL
  status: string | null;   // 9 bits, ej: "100000000"
  voltaje: number | null;
  voltaje_bateria?: number | null;
  odometro?: number | null;
  tipo_alerta?: number | null;
  // Campos calculados por el backend (tiempo transcurrido)
  segundos?: number | null;   // segundos desde fecha_hora_gps
  segundos_sistema?: number | null;   // segundos desde fecha_hora_sistema
  // Sensores especiales
  door?: number | null;   // 1 = puerta abierta
  inmovilizador?: number | null;   // 1 = inmovilizador activo
  litros_tanque?: number | null;   // litros si tiene sensor de combustible
  nivel_tanque?: number | null;   // porcentaje si tiene sensor
}

// ── Unidad ────────────────────────────────────────────────────────────────────

/**
 * Unidad completa para el mapa de monitoreo.
 *
 * Incluye los campos de la unidad (t_unidades) más la telemetría en vivo
 * y los campos de actividad del último viaje que muestra el PHP legacy
 * en el infoWindow.
 */
export interface MapUnitItem {
  // Datos de la unidad
  id: number;
  numero: string;        // siempre viene como "U123" del backend
  imei: string;
  marca: string;
  modelo: string;
  operador?: string | null;
  imagen?: string | null;
  vel_max?: number | null; // velocidad máxima configurada

  // Sensores configurados (tipo numérico — ver catálogo de periféricos)
  input1?: number | null;
  input2?: number | null;
  input3?: number | null;
  input4?: number | null;

  // Último viaje — usado en el infoWindow (igual que el PHP legacy)
  fecha_hora_ultimo_encendido?: string | null;
  fecha_hora_ultimo_apagado?: string | null;
  odometro_ultimo_encendido?: number | null;
  odometro_inicio_ultimo_viaje?: number | null;
  odometro_fin_ultimo_viaje?: number | null;
  fecha_hora_inicio_ultimo_viaje?: string | null;
  fecha_hora_fin_ultimo_viaje?: string | null;

  // Telemetría en vivo
  telemetry: UnitTelemetry | null;
}

// ── Resumen de unidad para el drawer de recorridos ────────────────────────────

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

// ── Puntos del recorrido ──────────────────────────────────────────────────────

/**
 * Punto individual del recorrido desde t_data.
 *
 * El campo `strokeColor` viene calculado por el backend según velocidad
 * vs vel_max (verde normal, naranja cerca del límite, rojo exceso).
 * Si no viene, el frontend lo calcula con getStrokeColorForSpeed().
 */
export interface RoutePoint {
  id_data?: number;
  fecha_hora_gps: string;         // UTC — usar date-time.ts para mostrar
  latitud: number;
  longitud: number;
  velocidad: number | null;
  grados: number | null;  // dirección real del AVL (0-360)
  status: string | null;
  tipo_alerta?: number | null;
  strokeColor?: string | null;  // color de la polyline en ese segmento
  // Campos calculados en el frontend o enviados por el backend
  movement_state?: "apagado" | "stop" | "movimiento" | "desconocido";
  // Distancia acumulada desde el inicio (calculada al procesar la ruta)
  distancia_lat_lng?: number;
}

// ── Recorridos recientes ──────────────────────────────────────────────────────

export interface RecentTripItem {
  id: string;
  label: string;
  start_time: string;   // UTC — usar date-time.ts
  end_time: string;   // UTC — usar date-time.ts
  duration_seconds: number;
  distance_km: number;
}

// ── Rutas predefinidas ────────────────────────────────────────────────────────

export interface MapRutaItem {
  id_ruta: number;
  id_logistica_ruta: number;
  clave: string;
  nombre: string;
  cliente: string | null;
  paradas: number;     // cantidad de paradas
  path_color: string | null;
  path: Array<{ lat: number; lng: number }>;
  paradas_data: MapParadaItem[];
}

export interface MapParadaItem {
  id_parada: number;
  tipo: number;   // 1=inicio, 2=parada intermedia, 3=fin
  tipo_poi: number;   // 1=círculo, 2=polígono
  numero: number;
  nombre: string;
  latitud: number;
  longitud: number;
  radio: number;
  polygon_path: string | null;
  direccion: string | null;
}

// ── Rangos predefinidos del drawer de recorridos ──────────────────────────────

export type PredefinedRange =
  | "current"               // Recorrido actual (en curso)
  | "latest"                // Último recorrido completo
  | "today"                 // Hoy desde las 00:00
  | "yesterday"             // Ayer completo
  | "day_before_yesterday"  // Antier completo
  | "last_30_min"
  | "last_1_hour"
  | "last_2_hours"
  | "last_4_hours"
  | "last_8_hours"
  | "last_12_hours";

// ── Rango personalizado ───────────────────────────────────────────────────────

export interface CustomRangeParams {
  startDate: string;         // YYYY-MM-DD (local UTC-6)
  startTime?: string;         // HH:mm:ss (opcional)
  endDate: string;         // YYYY-MM-DD (local UTC-6)
  endTime?: string;         // HH:mm:ss (opcional)
}

// ── Opciones de visualización del recorrido ───────────────────────────────────
//
// Cada clave corresponde a una capa de eventos que puede mostrarse
// u ocultarse independientemente en el mapa y en el timeline lateral.
export interface RouteDisplayOptions {
  flags: boolean;  // i=8: banderas de inicio y fin
  arrows: boolean;  // i=1: flechas de dirección básicas
  stops: boolean;  // i=2: paradas (relentí con motor encendido)
  speeding: boolean;  // i=3: excesos de velocidad
  engine: boolean;  // i=5: apagados de motor
  rfid: boolean;  // i=6: lecturas RFID
  alerts: boolean;  // i=7: botón de pánico / alertas
  doors: boolean;  // i=4: sensor de puerta abierta
}

// ── Resumen extendido del recorrido ───────────────────────────────────────────

export interface ExtendedRouteSummary {
  movementCount: number;    // cantidad de arranques
  distanceKm: number;    // km recorridos
  movingSeconds: number;    // tiempo en movimiento
  idleSeconds: number;    // tiempo en relentí (motor encendido, velocidad 0)
  offSeconds: number;    // tiempo con motor apagado
  speedingCount: number;    // excesos de velocidad
}