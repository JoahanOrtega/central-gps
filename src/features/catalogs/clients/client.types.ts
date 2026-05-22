// Tipos de Clientes
// ClientItem: lo que devuelve GET /catalogs/clients (listado).
// ClientPayload: lo que se manda en POST/PUT.

export interface ClientItem {
  id_cliente:    number;
  id_empresa:    number;
  clave:         string;
  nombre:        string;
  contacto:      string | null;
  telefono:      string | null;
  email:         string | null;
  imagen:        string | null;
  observaciones: string | null;
  id_poi:        number | null;
  // Estos vienen del JOIN con t_pois
  direccion:     string | null;
  coordenadas:   string | null;
  fecha_registro: string | null;
  fecha_cambio:   string | null;
}

export interface CreateClientPayload {
  clave:         string;
  nombre:        string;
  contacto?:     string | null;
  telefono?:     string | null;
  email?:        string | null;
  observaciones?: string | null;
  id_poi?:       number | null;
  imagen?:       string | null;
}

export interface UpdateClientPayload {
  clave?:        string | null;
  nombre?:       string | null;
  contacto?:     string | null;
  telefono?:     string | null;
  email?:        string | null;
  observaciones?: string | null;
  id_poi?:       number | null;
  imagen?:       string | null;
}

// Errores de validación por campo — los misma forma que devuelve el backend
// en 422 con el código CLAVE_TAKEN o campos inválidos.
export interface ClientFieldErrors {
  clave?:   string[];
  nombre?:  string[];
  email?:   string[];
}