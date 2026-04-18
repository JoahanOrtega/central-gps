import { create } from "zustand";

// ── Tipo del payload decodificado del JWT ─────────────────────────────────────
// Refleja exactamente los campos que el backend incluye en el access token.
// La verificación de firma la hace el backend — aquí solo leemos el payload.
export interface JwtPayload {
    sub: string;
    username: string;
    nombre: string | null;
    perfil: number;
    rol: "sudo_erp" | "admin_empresa" | "usuario" | null;
    id_empresa: number | null;
    nombre_empresa: string | null;
    es_admin_empresa: boolean;
    // Permisos para usuarios con rol "usuario".
    // Formato: string separado por comas — "on,cund1,cpoi1" — o "*" para wildcard.
    permisos?: string;
    exp: number;    // Unix timestamp — segundos desde epoch
    iat: number;    // Unix timestamp — fecha de emisión
    type: string;   // Debe ser "access"
}

interface AuthState {
    // ── Access token en MEMORIA ───────────────────────────────────────────────
    // NUNCA en localStorage ni sessionStorage.
    // Si hay XSS, el token en memoria no es accesible desde JavaScript externo.
    // Se pierde al recargar la página — se recupera via tryRestoreSession().
    token: string | null;
    user: JwtPayload | null;

    // Guarda el access token en memoria y decodifica el payload
    setToken: (token: string | null) => void;

    // Cierra sesión: limpia memoria y llama /auth/logout para revocar cookie
    logout: () => Promise<void>;

    // Verifica si el access token en memoria ha expirado
    isTokenExpired: () => boolean;

    // Intenta restaurar la sesión al arrancar la app llamando /auth/refresh.
    // Si la cookie HttpOnly del refresh token existe y es válida,
    // obtiene un nuevo access token sin que el usuario tenga que hacer login.
    // Retorna true si la sesión se restauró, false si hay que ir a /login.
    tryRestoreSession: () => Promise<boolean>;

    // Helpers de rol
    isSudoErp: () => boolean;
    isAdminEmpresa: () => boolean;
}

// ── Margen de expiración ──────────────────────────────────────────────────────
// Renovar 60 segundos antes de que expire para evitar race conditions donde
// el token vence justo entre la verificación y la petición HTTP.
const EXPIRY_MARGIN_SECONDS = 60;

const hasExpired = (exp: number): boolean => {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return exp < nowInSeconds + EXPIRY_MARGIN_SECONDS;
};

// Decodifica el payload del JWT sin verificar la firma.
// La verificación real la hace el backend en cada petición.
const parseToken = (token: string): JwtPayload | null => {
    try {
        return JSON.parse(atob(token.split(".")[1])) as JwtPayload;
    } catch {
        return null;
    }
};

// ── Store de autenticación ────────────────────────────────────────────────────
// Sin zustand/persist — el token vive solo en memoria React.
// La persistencia de sesión la maneja el refresh token en la cookie HttpOnly.
export const useAuthStore = create<AuthState>()((set, get) => ({
    token: null,
    user: null,

    setToken: (token) => {
        if (!token) {
            set({ token: null, user: null });
            return;
        }

        const payload = parseToken(token);

        if (!payload) {
            // Token con formato inválido — no guardar
            set({ token: null, user: null });
            return;
        }

        if (hasExpired(payload.exp)) {
            // Token expirado — no guardar, dejar que tryRestoreSession lo renueve
            set({ token: null, user: null });
            return;
        }

        set({ token, user: payload });
    },

    logout: async () => {
        // Llamar al backend para revocar el refresh token en BD
        // y eliminar la cookie HttpOnly del navegador
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            await fetch(`${apiUrl}/auth/logout`, {
                method: "POST",
                credentials: "include",
            });
        } catch {
            // Si la petición falla, limpiar igualmente el estado local
        }
        // Borrar la marca de sesión — si el usuario hace logout limpio,
        // no debe ver "Tu sesión expiró" en el siguiente acceso
        localStorage.removeItem("cgps_had_session");
        set({ token: null, user: null });
    },

    isTokenExpired: () => {
        const { user } = get();
        if (!user) return true;
        return hasExpired(user.exp);
    },

    // Llamado por PrivateRoute al montar la app.
    // Intenta renovar la sesión usando la cookie HttpOnly del refresh token.
    // Si la cookie existe y es válida → nuevo access token en memoria.
    // Si no → retorna false → PrivateRoute redirige a /login.
    tryRestoreSession: async (): Promise<boolean> => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(`${apiUrl}/auth/refresh`, {
                method: "POST",
                credentials: "include",     // El navegador envía la cookie automáticamente
            });

            if (!response.ok) {
                set({ token: null, user: null });
                return false;
            }

            const data = await response.json() as { token: string; user: JwtPayload };
            const payload = parseToken(data.token);

            if (!payload) {
                set({ token: null, user: null });
                return false;
            }

            set({ token: data.token, user: payload });
            return true;
        } catch {
            // Error de red — no hay sesión que restaurar
            set({ token: null, user: null });
            return false;
        }
    },

    isSudoErp: () => get().user?.rol === "sudo_erp",

    isAdminEmpresa: () => {
        const user = get().user;
        return user?.rol === "sudo_erp" || user?.es_admin_empresa === true;
    },
}));