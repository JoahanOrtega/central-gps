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
// Shape del endpoint GET /admin-erp/empresas/<id>/usuarios.
// Proyección de la vista v_erp_usuarios_empresa tras el refactor 1:N
// (migración 004). Ver backend/migrations/004_vista_usuarios_empresa_1_a_1.sql.
//
// Campos retirados en el refactor:
//   - es_admin_empresa → se infiere de rol === "admin_empresa"
//   - status_relacion  → la relación vive en t_usuarios, no hay status aparte
//   - autenticacion_2f → no se usa en la UI actual; si hace falta, agregar
//                         explícitamente con una query dedicada
export interface UsuarioEmpresa {
  id_empresa: number;
  empresa: string;
  id_usuario: number;
  email_login: string;
  nombre_usuario: string;
  rol: string;
  nombre_rol: string;
  status_usuario: number;
  fecha_asignacion: string;
  total_permisos: number;
}

// Payload de creación de un admin de empresa.
// Coincide con CreateEmpresaAdminSchema del backend (validators/erp_validators.py).
//
// Restricciones aplicadas (duplicadas en frontend para UX inmediato y en
// backend para seguridad real):
//   - usuario: 3-100 caracteres
//   - clave:   8-128 caracteres
//   - nombre:  2-150 caracteres
//   - email, telefono: opcionales
export interface AdminEmpresaFormData {
  usuario: string;
  clave: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
}

// Respuesta del endpoint POST /admin-erp/empresas/:id/usuarios.
// Coincide con el dict que retorna create_empresa_admin del backend.
// El rol devuelto siempre será "admin_empresa" (es lo que crea ese endpoint);
// no hay campo separado para "es admin" — se infiere del rol.
export interface AdminEmpresaCreado {
  id_usuario: number;
  usuario: string;
  nombre: string;
  id_empresa: number;
  rol: string;
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