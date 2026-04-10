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
  perfil: number;
  id_empresa: number | null;
  nombre_empresa: string | null;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}