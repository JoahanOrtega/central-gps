import { useAuthStore } from "@/stores/authStore";

const API_URL = import.meta.env.VITE_API_URL ?? "";

// ── Tipos de respuesta de error que aceptamos ────────────────────────────────
// El backend puede devolver el error en varias formas:
//   { error: "Mensaje plano" }
//   { error: { campo: ["msg1", "msg2"] } }    ← Marshmallow validate
//   { message: "..." }
//   "Mensaje suelto"

interface ApiErrorResponse {
  error?: string | Record<string, string[] | string>;
  message?: string;
}

// ── Clase de error tipada ────────────────────────────────────────────────────
// Reemplaza al `new Error(...)` plano. La vista puede inspeccionar .status
// para decidir qué banner mostrar (ver clasificarError en ErrorBanner.tsx).

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

// ── Parser de mensajes de error ──────────────────────────────────────────────
// Convierte cualquier formato de error del backend en:
//   { message: string, fieldErrors?: { campo: string } }
//
// CLAVE: cuando `error` es un objeto (Marshmallow validation), antes se hacía
// `String(error)` → "[object Object]". Ahora aplanamos a un mensaje legible
// y guardamos el detalle por campo para la UI.

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

// ── Renovación automática del access token ───────────────────────────────────

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  requiresAuth?: boolean;
  _isRetryAfterRefresh?: boolean;
}

let _refreshPromise: Promise<boolean> | null = null;

const refreshAccessToken = async (): Promise<boolean> => {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
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

// ── Cliente HTTP centralizado ────────────────────────────────────────────────

export const apiFetch = async <T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const {
    body,
    requiresAuth = true,
    _isRetryAfterRefresh = false,
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

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  // ── Interceptor de renovación de token ───────────────────────────────────
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
// Sube un archivo por multipart/form-data. No usa apiFetch porque este fuerza
// Content-Type: application/json; con FormData hay que dejar que el navegador
// ponga el multipart con su boundary. Reusa el token y el API_URL.
export const apiUpload = async <T>(
  endpoint: string,
  file: File,
  fieldName = "file",
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