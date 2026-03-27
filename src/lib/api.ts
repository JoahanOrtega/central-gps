import { getStoredToken, clearAuthSession } from "@/auth/utils/auth-storage";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("API_URL no está definida");
}

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  requiresAuth?: boolean;
}

export const apiFetch = async <T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const { body, requiresAuth = true, headers, ...rest } = options;

  const token = getStoredToken();

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Content-Type", "application/json");

  if (requiresAuth && token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...rest,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("No fue posible conectar con el servidor");
  }

  const rawText = await response.text();

  let data: any = null;

  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error("La respuesta del servidor no es JSON válido");
  }

  if (!response.ok) {
    if (response.status === 401 && requiresAuth) {
      clearAuthSession();
      throw new Error(data?.error || "Sesión no válida");
    }

    if (response.status >= 500) {
      throw new Error(
        data?.error || "Ocurrió un error interno. Intenta nuevamente.",
      );
    }

    throw new Error(data?.error || "Ocurrió un error en la petición");
  }

  if (!data) {
    throw new Error("El servidor no devolvió información");
  }

  return data as T;
};
