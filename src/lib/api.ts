import { useAuthStore } from "@/stores/authStore";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL no está definida. Revisa tu archivo .env");
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  requiresAuth?: boolean;
  // Uso interno — evita bucle infinito al reintentar tras un refresh
  _isRetryAfterRefresh?: boolean;
}

const parseErrorMessage = (data: unknown, fallback: string): string => {
  if (data && typeof data === "object") {
    const errorData = data as ApiErrorResponse;
    return errorData.error ?? errorData.message ?? fallback;
  }
  return fallback;
};

// ── Renovación automática del access token ────────────────────────────────────
// Se llama cuando el servidor devuelve 401 con un access token expirado.
// Usa la cookie HttpOnly del refresh token — el navegador la envía automáticamente.
//
// _refreshPromise previene múltiples llamadas simultáneas a /auth/refresh.
// Si dos peticiones reciben 401 al mismo tiempo, solo una hace el refresh —
// la segunda espera a que termine y usa el nuevo token.
let _refreshPromise: Promise<boolean> | null = null;

const refreshAccessToken = async (): Promise<boolean> => {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",   // El navegador envía la cookie HttpOnly
      });

      if (!response.ok) {
        // Refresh falló (cookie expirada o revocada) → cerrar sesión
        await useAuthStore.getState().logout();
        return false;
      }

      const data = await response.json() as { token: string };
      useAuthStore.getState().setToken(data.token);
      return true;
    } catch {
      await useAuthStore.getState().logout();
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
};

// ── Cliente HTTP centralizado ─────────────────────────────────────────────────
// Todas las peticiones al backend pasan por aquí.
//
// Responsabilidades:
//   1. Adjuntar el access token JWT en Authorization header
//   2. Incluir cookies en todas las peticiones (credentials: "include")
//   3. Ante un 401: renovar el access token y reintentar la petición original
//   4. Si el refresh también falla: hacer logout
//   5. Parsear respuestas JSON y propagar errores con mensajes claros
export const apiFetch = async <T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const {
    body,
    requiresAuth = true,
    headers,
    _isRetryAfterRefresh = false,
    ...rest
  } = options;

  const token = useAuthStore.getState().token;

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
      credentials: "include",     // Necesario para que la cookie HttpOnly viaje
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // Re-lanzar AbortError tal cual para que handleError lo ignore silenciosamente
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new Error("No fue posible conectar con el servidor");
  }

  // ── Interceptor de renovación automática ─────────────────────────────────
  // Si el servidor devuelve 401 y no es ya un reintento tras refresh,
  // intentar renovar el access token usando la cookie HttpOnly del refresh token.
  if (response.status === 401 && requiresAuth && !_isRetryAfterRefresh) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      // Reintentar la petición original con el nuevo access token
      return apiFetch<T>(endpoint, {
        ...options,
        _isRetryAfterRefresh: true,   // Marcar para evitar bucle infinito
      });
    }

    // Refresh también falló → sesión terminada
    throw new Error("Sesión expirada. Por favor inicia sesión nuevamente.");
  }

  const rawText = await response.text();
  let data: unknown = null;

  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error("La respuesta del servidor no es JSON válido");
  }

  if (!response.ok) {
    if (response.status === 401 && requiresAuth) {
      await useAuthStore.getState().logout();
      throw new Error(parseErrorMessage(data, "Sesión no válida"));
    }

    if (response.status >= 500) {
      throw new Error(
        parseErrorMessage(data, "Ocurrió un error interno. Intenta nuevamente.")
      );
    }

    throw new Error(parseErrorMessage(data, "Ocurrió un error en la petición"));
  }

  if (!data) {
    throw new Error("El servidor no devolvió información");
  }

  return data as T;
};