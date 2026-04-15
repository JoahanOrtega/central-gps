import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tipo del payload decodificado del JWT
interface JwtPayload {
    sub: string;
    username: string;
    nombre: string | null;
    perfil: number;
    rol: "sudo_erp" | "admin_empresa" | "usuario" | null;
    id_empresa: number | null;
    nombre_empresa: string | null;
    es_admin_empresa: boolean;
    exp: number;
    iat: number;
}

interface AuthState {
    token: string | null;
    user: JwtPayload | null;
    setToken: (token: string | null) => void;
    logout: () => void;
    // Helper: verifica si el usuario activo es sudo ERP
    isSudoErp: () => boolean;
    // Helper: verifica si es admin de su empresa
    isAdminEmpresa: () => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,

            setToken: (token) => {
                if (!token) {
                    set({ token: null, user: null });
                    return;
                }
                try {
                    // Decodificar el payload del JWT (sin verificar firma, eso lo hace el backend)
                    const payload = JSON.parse(atob(token.split(".")[1])) as JwtPayload;
                    set({ token, user: payload });
                } catch {
                    set({ token, user: null });
                }
            },

            logout: () => set({ token: null, user: null }),

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