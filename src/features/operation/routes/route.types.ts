// Tipos del módulo de Rutas
export interface LatLng {
  lat: number;
  lng: number;
}

// Una parada dentro de una logística (punto de abordaje)
export interface Parada {
  id: string;
  numero: number;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  tipo_geocerca: "circular" | "poligonal" | "rectangular";
  radio: number;
  poligono?: LatLng[];
  // Si la parada se creó a partir de un POI existente, guardamos su id
  id_poi?: number | null;
  // Marca las paradas especiales de inicio/fin de ruta.
  esFija?: "inicio" | "fin";
}


// Logistica = un sentido de la ruta (ida o vuelta)
export interface Logistica {
  id_logistica_ruta?: number;
  tipo_logistica: 1 | 2;          // 1=A-B, 2=B-A
  direccion_inicio: string;
  direccion_fin: string;
  fecha_inicio: string | null;  // ISO date
  tiempo_recorrido_min: number | null;
  kilometros: number | null;
  // Trazo de la ruta como lista de coordenadas (en el front).
  // El backend lo codifica a polyline antes de guardar.
  path: LatLng[];
  paradas: Parada[];
}

// Tipo de ruta — refleja el select "Tipo de ruta" del modal
export type TipoRuta =
  | "transporte_personal"
  | "transporte_publico"
  | "reparto"
  | "viaje_especial";

// Ruta completa
export interface Route {
  id_ruta?: number;
  id_empresa?: number | null;
  clave: string;
  nombre: string;
  tipo: TipoRuta;
  id_cliente: number | null;
  observaciones: string;
  id_grupo_rutas: number[];      // una ruta puede estar en varios grupos
  logisticas: Logistica[];   // 1 o 2 logísticas
}

// Item del listado de rutas (vista resumida del catalogo)
export interface RouteItem {
  id_ruta: number;
  clave: string;
  nombre: string;
  tipo: TipoRuta;
  cliente: string | null;
  total_paradas: number;
  total_logisticas: number;
  kilometros: number | null;
  fecha_inicio: string | null;
}

// Payload de creacion/edicion
export interface CreateRoutePayload {
  clave: string;
  nombre: string;
  tipo: TipoRuta;
  id_cliente: number | null;
  observaciones: string | null;
  id_grupo_rutas: number[];
  id_empresa?: number | null;
  logisticas: Logistica[];
}

// KML

// Resultado de parsear un archivo KML
export interface KmlImportResult {
  // El trazo (LineString) del KML
  trace: LatLng[];
  // Las paradas (Points) del KML
  waypoints: Parada[];
  // Avisos no fatales (ej: "el KML no tiene LineString")
  warnings: string[];
}

// Errores de validación por campo (mismo patrón que el resto de módulos)
export type RouteFieldErrors = Partial<Record<keyof CreateRoutePayload, string[]>>;