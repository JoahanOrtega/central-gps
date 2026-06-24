export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginFormValues extends LoginPayload {
  remember: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
  nombre: string | null;
  // Legacy — se mantiene mientras se migra el PHP
  perfil: number;
  // Nuevo — rol normalizado del sistema.
  // Para saber si es admin de empresa: rol === "admin_empresa".
  // El flag booleano es_admin_empresa fue eliminado por redundante.
  rol: "sudo_erp" | "admin_empresa" | "usuario" | null;
  id_empresa: number | null;
  nombre_empresa: string | null;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}

// ─── Cambio de contraseña ─────────────────────────────────────────────────────
// Tipos del flujo PATCH /auth/change-password.
//
// El payload refleja exactamente lo que valida ChangePasswordSchema en el
// backend. Cualquier divergencia entre estos tipos y el schema sería un bug:
// el frontend pintaría un campo que el backend no espera o viceversa.

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ChangePasswordResponse {
  message: string;
}

// Errores 422 del backend tienen este formato:
//   { error: "Datos invalidos", fields: { campo: [mensaje, ...] } }
//
// Capturar los `fields` permite al modal pintar el error DEBAJO del campo
// específico que falló, en lugar de mostrar un toast genérico.
// Cuando el error es de otro tipo (401, 500, red), `fields` no viene y
// el componente debe caer al manejo genérico (mensaje global del modal).
export interface ChangePasswordFieldErrors {
  current_password?: string[];
  new_password?: string[];
  confirm_password?: string[];
}

// Resultado discriminado del service. Usar un union en lugar de
// {success, error} sueltos obliga al consumidor a chequear el discriminante
// y evita estados imposibles (success=true + error="..." al mismo tiempo).
export type ChangePasswordResult =
  | { kind: "success"; message: string }
  | { kind: "validation"; fields: ChangePasswordFieldErrors }
  | { kind: "error"; message: string };