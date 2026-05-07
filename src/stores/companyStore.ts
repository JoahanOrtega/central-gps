import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "./authStore";

// ── Tipos ─────────────────────────────────────────────────────
interface Company {
    id_empresa: number;
    nombre: string;
}

interface CompanyStore {
    companies: Company[];
    currentCompany: Company | null;
    isLoading: boolean;
    fetchError: string | null;
    fetchCompanies: () => Promise<void>;
    switchCompany: (companyId: number) => Promise<void>;
}

// ── Persistencia de última empresa seleccionada ───────────────
// Guarda en localStorage la última empresa que el sudo_erp seleccionó.
// La próxima vez que inicie sesión, arranca en esa empresa en lugar
// de la primera de la lista (alfabética, no necesariamente la deseada).
//
// La clave incluye el sub (ID del usuario) para que cada usuario del
// sistema tenga su propia preferencia — si hay varios sudos, cada uno
// recuerda su empresa preferida independientemente.
//
// No se persiste para admin_empresa ni usuario porque ellos solo tienen
// una empresa y no pueden cambiarla — no tiene sentido guardar nada.

const STORAGE_KEY_PREFIX = "cgps_last_empresa_";

const getStorageKey = (sub: string): string =>
    `${STORAGE_KEY_PREFIX}${sub}`;

const leerUltimaEmpresa = (sub: string): number | null => {
    try {
        const raw = localStorage.getItem(getStorageKey(sub));
        if (!raw) return null;
        const parsed = parseInt(raw, 10);
        return Number.isNaN(parsed) ? null : parsed;
    } catch {
        // localStorage bloqueado (modo privado, Safari ITP, etc.) — ignorar
        return null;
    }
};

const guardarUltimaEmpresa = (sub: string, idEmpresa: number): void => {
    try {
        localStorage.setItem(getStorageKey(sub), String(idEmpresa));
    } catch {
        // localStorage bloqueado — ignorar silenciosamente
    }
};

// ── Store de empresa activa ───────────────────────────────────
export const useCompanyStore = create<CompanyStore>((set, get) => ({
    companies: [],
    currentCompany: null,
    isLoading: false,
    fetchError: null,

    fetchCompanies: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        set({ isLoading: true, fetchError: null });
        try {
            const data = await apiFetch<Company[]>("/companies");

            const user = useAuthStore.getState().user;
            const jwtIdEmpresa = user?.id_empresa ?? null;
            const sub = user?.sub ?? null;
            const rol = user?.rol ?? null;

            let selectedCompany: Company | null = null;

            if (jwtIdEmpresa) {
                // Rol con empresa fija (admin_empresa, usuario):
                // el JWT ya trae la empresa correcta — usarla directamente.
                selectedCompany =
                    data.find(c => c.id_empresa === jwtIdEmpresa) ?? data[0] ?? null;
            } else if (sub && rol === "sudo_erp") {
                // sudo_erp: el JWT trae id_empresa: null porque puede operar
                // en cualquier empresa.
                //
                // Orden de prioridad:
                //   1. Última empresa guardada en localStorage para este usuario
                //   2. Tadimex (id_empresa=1) — empresa principal del sistema
                //   3. Primera empresa de la lista (fallback si Tadimex no existe)
                //
                // El default de Tadimex aplica solo la primera vez (sin preferencia
                // guardada). A partir de ahí, cada switch queda persistido.
                const EMPRESA_DEFAULT_SUDO = 1; // Tadimex
                const ultimaEmpresaId = leerUltimaEmpresa(sub);
                const targetId = ultimaEmpresaId ?? EMPRESA_DEFAULT_SUDO;
                selectedCompany =
                    data.find(c => c.id_empresa === targetId)
                    ?? data[0]
                    ?? null;
            } else {
                selectedCompany = data[0] ?? null;
            }

            set({ companies: data, currentCompany: selectedCompany });
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : "No fue posible cargar las empresas";
            set({ fetchError: message });
        } finally {
            set({ isLoading: false });
        }
    },

    switchCompany: async (companyId: number) => {
        if (get().currentCompany?.id_empresa === companyId) return;

        set({ isLoading: true });
        try {
            const response = await apiFetch<{
                token: string;
                id_empresa: number;
                nombre_empresa: string;
            }>("/auth/switch-company", {
                method: "POST",
                body: { id_empresa: companyId },
            });

            useAuthStore.getState().setToken(response.token);

            const newCurrent =
                get().companies.find(c => c.id_empresa === response.id_empresa) ??
                { id_empresa: response.id_empresa, nombre: response.nombre_empresa };

            set({ currentCompany: newCurrent });

            // Persistir la elección para que el próximo login arranque aquí.
            // Solo para sudo_erp — los demás roles no pueden hacer switch.
            const sub = useAuthStore.getState().user?.sub ?? null;
            if (sub) {
                guardarUltimaEmpresa(sub, response.id_empresa);
            }
        } catch (error) {
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },
}));