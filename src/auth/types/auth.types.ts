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