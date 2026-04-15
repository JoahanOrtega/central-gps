// Tipos que corresponden a las respuestas de los endpoints /admin-erp/...

// ── Empresas ──────────────────────────────────────────────
export interface EmpresaResumen {
  id_empresa: number;
  empresa: string;
  status: number;
  total_unidades: number;
  total_usuarios: number;
  total_clientes: number;
  total_admins_empresa: number;
  email_principal: string | null;
  fecha_registro: string;
}

export interface EmpresaFormData {
  nombre: string;
  direccion?: string;
  telefonos?: string;
  lat?: number;
  lng?: number;
  logo?: string;
}

// ── Usuarios de empresa ───────────────────────────────────
export interface UsuarioEmpresa {
  id_empresa: number;
  empresa: string;
  id_usuario: number;
  email_login: string;
  nombre_usuario: string;
  rol: string;
  nombre_rol: string;
  es_admin_empresa: number;
  status_relacion: number;
  status_usuario: number;
  autenticacion_2f: number;
  fecha_asignacion: string;
  total_permisos: number;
}

// ── Permisos del sistema ──────────────────────────────────
export interface PermisoSistema {
  id_permiso: number;
  clave: string;
  nombre: string;
  modulo: string;
  descripcion: string | null;
  status: number;
  usuarios_con_permiso: number;
  empresas_con_permiso: number;
}

export interface PermisoFormData {
  clave: string;
  nombre: string;
  modulo?: string;
  descripcion?: string;
}

// ── Auditoría ─────────────────────────────────────────────
export interface RegistroAuditoria {
  id_auditoria: number;
  email_usuario: string;
  nombre_usuario: string;
  rol_usuario: string;
  entidad: string;
  id_entidad: number | null;
  accion: string;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  ip_origen: string | null;
  fecha_registro: string;
}