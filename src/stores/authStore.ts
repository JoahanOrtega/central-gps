import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Tipo del payload decodificado del JWT ─────────────────────
// Refleja exactamente los campos que el backend incluye en el token.
// La verificación de firma la hace el backend — aquí solo leemos el payload.
interface JwtPayload {
    sub: string;
    username: string;
    nombre: string | null;
    perfil: number;
    rol: "sudo_erp" | "admin_empresa" | "usuario" | null;
    id_empresa: number | null;
    nombre_empresa: string | null;
    es_admin_empresa: boolean;
    // Campo de permisos para usuarios con rol "usuario".
    // Formato: string separado por comas — "on,cund1,cpoi1" — o "*" para wildcard.
    permisos?: string;
    exp: number;  // Unix timestamp — segundos desde epoch
    iat: number;  // Unix timestamp — fecha de emisión
}

interface AuthState {
    token: string | null;
    user: JwtPayload | null;
    setToken: (token: string | null) => void;
    logout: () => void;
    // Verifica si el token actualmente almacenado ha expirado
    isTokenExpired: () => boolean;
    // Revisa la sesión guardada en localStorage al arrancar la app.
    // Si el token expiró, hace logout silencioso antes de mostrar la UI.
    checkAndRefreshSession: () => void;
    // Helper: verifica si el usuario activo es sudo ERP
    isSudoErp: () => boolean;
    // Helper: verifica si es admin de su empresa
    isAdminEmpresa: () => boolean;
}

// ── Utilidad: comprueba si un timestamp 'exp' ya venció ───────
// Agrega un margen de 30 segundos para evitar race conditions
// donde el token vence justo entre la verificación y la petición.
const EXPIRY_MARGIN_SECONDS = 30;

const hasExpired = (exp: number): boolean => {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return exp < nowInSeconds + EXPIRY_MARGIN_SECONDS;
};

// ── Store de autenticación ────────────────────────────────────
export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,

            setToken: (token) => {
                // Token nulo o vacío → limpiar sesión
                if (!token) {
                    set({ token: null, user: null });
                    return;
                }

                try {
                    // Decodificar el payload del JWT (sin verificar firma, eso lo hace el backend)
                    const payload = JSON.parse(atob(token.split(".")[1])) as JwtPayload;

                    // Verificar que el token no haya expirado antes de guardarlo.
                    // Esto cubre el caso donde el backend emite el token justo
                    // en el límite de expiración o hay desajuste de reloj.
                    if (hasExpired(payload.exp)) {
                        set({ token: null, user: null });
                        return;
                    }

                    set({ token, user: payload });
                } catch {
                    // Si el JWT tiene formato inválido, no guardar nada
                    set({ token: null, user: null });
                }
            },

            logout: () => set({ token: null, user: null }),

            // Retorna true si el token almacenado ya expiró (o no existe)
            isTokenExpired: () => {
                const { user } = get();
                if (!user) return true;
                return hasExpired(user.exp);
            },

            // Llamar esta función al arrancar la app (en PrivateRoute o en el layout raíz).
            // Si el usuario tenía sesión guardada pero el token ya venció,
            // lo expulsa silenciosamente antes de que la UI siquiera se muestre.
            checkAndRefreshSession: () => {
                const { user, logout } = get();
                if (user && hasExpired(user.exp)) {
                    logout();
                }
            },

            // Retorna true solo si el rol es sudo_erp
            isSudoErp: () => get().user?.rol === "sudo_erp",

            // Retorna true si es sudo_erp O si es admin de su empresa
            isAdminEmpresa: () => {
                const user = get().user;
                return user?.rol === "sudo_erp" || user?.es_admin_empresa === true;
            },
        }),
        {
            name: "auth-storage",
        }
    )
);