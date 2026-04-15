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
  // Nuevo — rol normalizado del sistema
  rol: "sudo_erp" | "admin_empresa" | "usuario" | null;
  id_empresa: number | null;
  nombre_empresa: string | null;
  es_admin_empresa: boolean;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}