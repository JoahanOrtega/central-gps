export interface ClientPoi {
  tipo_poi: number;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  radio: number | null;
  bounds: string | null;
  area: string | null;
  polygon_path: string | null;
  polygon_color: string | null;
  radio_color: string | null;
}

export interface ClientItem {
  id_cliente: number;
  id_empresa: number;
  clave: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  imagen: string | null;
  observaciones: string | null;
  id_poi: number | null;
  // Estos vienen del JOIN con t_pois
  direccion: string | null;
  coordenadas: string | null;
  // Geocerca completa (solo en el detalle getById; null si no tiene).
  poi?: ClientPoi | null;
  fecha_registro: string | null;
  fecha_cambio: string | null;
}

export interface CreateClientPayload {
  clave: string;
  nombre: string;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  observaciones?: string | null;
  id_poi?: number | null;
  imagen?: string | null;
  id_empresa?: number | null;
  // Domicilio (geocerca) anidado — el backend lo convierte en un registro t_pois.
  poi?: ClientPoi | null;
}

export interface UpdateClientPayload {
  clave?: string | null;
  nombre?: string | null;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  observaciones?: string | null;
  id_poi?: number | null;
  imagen?: string | null;
  poi?: ClientPoi | null;
}

// Errores de validación por campo — los misma forma que devuelve el backend
// en 422 con el código CLAVE_TAKEN o campos inválidos.
export interface ClientFieldErrors {
  clave?: string[];
  nombre?: string[];
  email?: string[];
}