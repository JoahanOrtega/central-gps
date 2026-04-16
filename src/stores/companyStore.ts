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
    // Mensaje de error de la última llamada a fetchCompanies.
    // null = sin error. Los componentes pueden leerlo para mostrar feedback.
    fetchError: string | null;
    fetchCompanies: () => Promise<void>;
    switchCompany: (companyId: number) => Promise<void>;
}

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

            // Usar la empresa que viene en el JWT como empresa activa actual.
            // Si no coincide ninguna (ej: fue suspendida), usar la primera disponible.
            const currentCompanyId = useAuthStore.getState().user?.id_empresa;
            const selectedCompany =
                data.find((c) => c.id_empresa === currentCompanyId) ?? data[0] ?? null;

            set({ companies: data, currentCompany: selectedCompany });
        } catch (error) {
            // Propagar el error al estado para que los componentes puedan reaccionar.
            // Antes se silenciaba con console.error y el usuario no veía nada.
            const message = error instanceof Error
                ? error.message
                : "No fue posible cargar las empresas";
            set({ fetchError: message });
        } finally {
            set({ isLoading: false });
        }
    },

    switchCompany: async (companyId: number) => {
        // Evitar cambiar a la empresa que ya está activa
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

            // 1. Actualizar el JWT en authStore con el nuevo token.
            //    Esto actualiza user.id_empresa, es_admin_empresa, etc.
            useAuthStore.getState().setToken(response.token);

            // 2. Actualizar la empresa activa en el store sin recargar la página.
            const newCurrent =
                get().companies.find((c) => c.id_empresa === response.id_empresa) ??
                { id_empresa: response.id_empresa, nombre: response.nombre_empresa };

            set({ currentCompany: newCurrent });
        } catch (error) {
            // Re-lanzar para que SwitchCompanyModal pueda mostrar el error al usuario
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },
}));