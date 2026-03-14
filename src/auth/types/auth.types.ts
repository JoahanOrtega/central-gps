export interface LoginPayload {
  username: string
  password: string
}

export interface AuthUser {
  id: number
  username: string
}

export interface LoginResponse {
  message: string
  user: AuthUser
}