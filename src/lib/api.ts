import { useAuthStore } from "@/stores/authStore";

const API_URL = import.meta.env.VITE_API_URL ?? "";

// Tipos de respuesta de error de la API

interface ApiErrorResponse {
  error?: string | Record<string, string[] | string>;
  message?: string;
}

// Clase de error personalizada para manejar errores de la API

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (fieldErrors) this.fieldErrors = fieldErrors;
  }
}

// Parseo de errores del backend
interface ParsedError {
  message: string;
  fieldErrors?: Record<string, string>;
}

const parseError = (data: unknown, fallback: string): ParsedError => {
  if (!data || typeof data !== "object") {
    return { message: fallback };
  }

  const errorData = data as ApiErrorResponse;
  const raw = errorData.error ?? errorData.message;

  if (typeof raw === "string") {
    return { message: raw };
  }

  // Errores estructurados de Marshmallow: { campo: ["msg1", ...] }
  if (raw && typeof raw === "object") {
    const fieldErrors: Record<string, string> = {};
    const partes: string[] = [];

    for (const [campo, msgs] of Object.entries(raw as Record<string, unknown>)) {
      const msg = Array.isArray(msgs)
        ? msgs.join(", ")
        : typeof msgs === "string"
          ? msgs
          : "";

      if (msg) {
        fieldErrors[campo] = msg;
        partes.push(`${campo}: ${msg}`);
      }
    }

    if (partes.length) {
      return {
        message: partes.length === 1 ? partes[0] : "Hay errores en los datos enviados",
        fieldErrors,
      };
    }
  }

  return { message: fallback };
};

//  Renovación automática del access token ─

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  requiresAuth?: boolean;
  _isRetryAfterRefresh?: boolean;
  // Timeout en milisegundos para la petición. Si se supera, aborta y lanza un ApiError 408.
  timeoutMs?: number;
}

// Timeout por defecto para las peticiones. Se puede sobreescribir en cada llamada.
const DEFAULT_TIMEOUT_MS = 30000;

let _refreshPromise: Promise<boolean> | null = null;

// BroadcastChannel para compartir tokens entre pestañas y evitar múltiples refreshes simultáneos
const AUTH_CHANNEL = "cgps-auth";
const REFRESH_LOCK = "cgps-refresh";

const authChannel: BroadcastChannel | null =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(AUTH_CHANNEL) : null;

// Adoptar tokens difundidos por otras pestañas.
authChannel?.addEventListener("message", (event: MessageEvent) => {
  const msg = event.data as { type?: string; token?: string };
  if (msg?.type === "token-refreshed" && msg.token) {
    useAuthStore.getState().setToken(msg.token);
  }
});

const _doRefresh = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      await useAuthStore.getState().logout();
      return false;
    }

    const data = (await response.json()) as { token: string };
    useAuthStore.getState().setToken(data.token);
    // Compartir con las demás pestañas: su cookie ya rotó, este token es
    // ahora el único válido para todas.
    authChannel?.postMessage({ type: "token-refreshed", token: data.token });
    return true;
  } catch {
    await useAuthStore.getState().logout();
    return false;
  }
};

const refreshAccessToken = async (): Promise<boolean> => {
  if (_refreshPromise) return _refreshPromise;

  const tokenAlSolicitar = useAuthStore.getState().token;

  _refreshPromise = (async () => {
    try {
      // Si el navegador soporta locks, pedimos uno para que solo una pestaña haga el refresh.
      if (typeof navigator !== "undefined" && "locks" in navigator) {
        return await navigator.locks.request(REFRESH_LOCK, async () => {
          // Si otra pestaña ya hizo el refresh mientras esperábamos el lock, no hacemos nada.
          const tokenActual = useAuthStore.getState().token;
          if (tokenActual && tokenActual !== tokenAlSolicitar) {
            return true;
          }
          return _doRefresh();
        });
      }
      return await _doRefresh();
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
};

//  Cliente HTTP centralizado 

export const apiFetch = async <T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const {
    body,
    requiresAuth = true,
    _isRetryAfterRefresh = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers: extraHeaders,
    ...rest
  } = options;

  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders as Record<string, string>),
  };

  if (requiresAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Timeout y abort controller para la petición
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...rest,
      headers,
      credentials: "include",
      signal: rest.signal ?? timeoutController.signal,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // Timeout de la petición (AbortError). Se lanza un ApiError 408 para que la UI pueda mostrar un banner.
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(
        "El servidor tardó demasiado en responder. Intenta nuevamente.",
        408,
      );
    }
    // Fallo de red real (sin conexión, DNS, etc.).
    throw new ApiError(
      "No se pudo conectar con el servidor. Revisa tu conexión.",
      0,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  //  Interceptor de renovación de token ─
  if (response.status === 401 && requiresAuth && !_isRetryAfterRefresh) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return apiFetch<T>(endpoint, {
        ...options,
        _isRetryAfterRefresh: true,
      });
    }

    throw new ApiError("Sesión expirada. Por favor inicia sesión nuevamente.", 401);
  }

  const rawText = await response.text();
  let data: unknown = null;

  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new ApiError("La respuesta del servidor no es JSON válido", response.status);
  }

  if (!response.ok) {
    const fallback =
      response.status >= 500
        ? "Ocurrió un error interno. Intenta nuevamente."
        : "Ocurrió un error en la petición";

    const parsed = parseError(data, fallback);

    if (response.status === 401 && requiresAuth) {
      await useAuthStore.getState().logout();
    }

    throw new ApiError(parsed.message, response.status, parsed.fieldErrors);
  }

  if (data === null) {
    throw new ApiError("El servidor no devolvió información", response.status);
  }

  return data as T;
};
// Función para subir archivos al backend con autenticación y manejo de errores
export const apiUpload = async <T>(
  endpoint: string,
  file: File,
  fieldName = "file",
  _esReintento = false,
): Promise<T> => {
  const token = useAuthStore.getState().token;

  const formData = new FormData();
  formData.set(fieldName, file);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: formData,
  });

  // Si la respuesta es 401 y no es un reintento, intentamos refrescar el token y reintentar la subida
  if (response.status === 401 && !_esReintento) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiUpload<T>(endpoint, file, fieldName, true);
    }
    await useAuthStore.getState().logout();
    throw new ApiError("Sesión expirada. Por favor inicia sesión nuevamente.", 401);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) || "No se pudo subir el archivo";
    throw new ApiError(
      typeof message === "string" ? message : "No se pudo subir el archivo",
      response.status,
    );
  }

  return data as T;
};