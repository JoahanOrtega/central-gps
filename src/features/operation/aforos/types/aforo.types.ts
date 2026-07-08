export interface GroupItem {
  id_grupo_aforos: number;
  id_empresa: number;
  id_cliente: number | null;
  clave: string | null;
  nombre: string;
  observaciones: string | null;
  id_ruta: number | null;
  status: number;
  fecha_registro: string | null;
}

export interface AforoItem {
  id_aforo: number;
  id_empresa: number;
  id_grupo_aforos: number | null;
  rfid: string;
  clave: string | null;
  nombre: string;
  departamento: string | null;
  direccion: string | null;
  id_ruta: number | null;
  referencia: string | null;
  fecha_asignacion: string | null;
  is_blacklist: boolean;
  blacklist_date: string | null;
  status: number;
  fecha_registro: string | null;
  grupo_nombre?: string | null;
  cliente_ruta?: string | null;
}

export interface RouteItem {
  id_ruta: number;
  nombre: string;
}

export interface ClientItem {
  id_cliente: number;
  nombre: string;
}

// Payloads
export interface CreateGroupPayload { nombre: string; id_empresa?: number | null; id_cliente?: number | null; clave?: string | null; observaciones?: string | null; id_ruta?: number | null; status?: number; }
export interface UpdateGroupPayload { nombre?: string; id_cliente?: number | null; clave?: string | null; observaciones?: string | null; id_ruta?: number | null; status?: number; }
export interface CreateAforoPayload { nombre: string; id_empresa?: number | null; id_grupo_aforos?: number | null; rfid?: string | null; clave?: string | null; departamento?: string | null; direccion?: string | null; telefono?: string | null; correo?: string | null; id_ruta?: number | null; referencia?: string | null; fecha_asignacion?: string | null; is_blacklist?: boolean; }
export interface UpdateAforoPayload { nombre?: string; id_grupo_aforos?: number | null; rfid?: string | null; clave?: string | null; departamento?: string | null; direccion?: string | null; telefono?: string | null; correo?: string | null; id_ruta?: number | null; referencia?: string | null; fecha_asignacion?: string | null; is_blacklist?: boolean; status?: number; }
export interface DeleteAforoResponse { message: string; id_aforo: number; }
export interface DeleteGroupResponse { message: string; id_grupo_aforos: number; }