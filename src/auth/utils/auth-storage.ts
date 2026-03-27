import type { AuthUser } from "../types/auth.types";

const TOKEN_KEY = "token";
const AUTH_USER_KEY = "authUser";

type StorageType = "local" | "session";

export const getAuthHeader = (): Record<string, string> => {
  const token = getStoredToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Función para obtener el almacenamiento adecuado según la preferencia del usuario
const getStorage = (storageType: StorageType): Storage => {
  return storageType === "local" ? localStorage : sessionStorage;
};

// Guarda la sesión de autenticación en el almacenamiento local o de sesión dependiendo de la preferencia del usuario
export const saveAuthSession = (
  token: string,
  user: AuthUser,
  remember: boolean,
): void => {
  const storage = getStorage(remember ? "local" : "session");

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);

  storage.setItem(TOKEN_KEY, token);
  storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

// Obtiene el token almacenado, ya sea en localStorage o sessionStorage
export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
};

// Obtiene el usuario autenticado almacenado, ya sea en localStorage o sessionStorage
export const getStoredAuthUser = (): AuthUser | null => {
  const storedUser =
    localStorage.getItem(AUTH_USER_KEY) ||
    sessionStorage.getItem(AUTH_USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    return null;
  }
};

// Limpia la sesión de autenticación eliminando los datos del token y del usuario tanto de localStorage como de sessionStorage
export const clearAuthSession = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
};

// Verifica si hay una sesión activa comprobando la existencia de un token almacenado
export const hasActiveSession = (): boolean => {
  return Boolean(getStoredToken());
};
