// src/stores/companyStore.ts
import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "./authStore";

interface Company {
    id_empresa: number;
    nombre: string;
}

interface CompanyStore {
    companies: Company[];
    currentCompany: Company | null;
    isLoading: boolean;
    fetchCompanies: () => Promise<void>;
    switchCompany: (companyId: number) => Promise<void>;
}

export const useCompanyStore = create<CompanyStore>((set, get) => ({
    companies: [],
    currentCompany: null,
    isLoading: false,

    fetchCompanies: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        set({ isLoading: true });
        try {
            const data = await apiFetch<Company[]>("/companies");

            // Usar la empresa que viene en el JWT como empresa activa actual.
            // Si no coincide ninguna (ej: fue suspendida), usar la primera disponible.
            const currentCompanyId = useAuthStore.getState().user?.id_empresa;
            const selectedCompany =
                data.find((c) => c.id_empresa === currentCompanyId) ?? data[0] ?? null;

            set({ companies: data, currentCompany: selectedCompany });
        } catch (error) {
            console.error("Error al cargar empresas:", error);
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

            // 1. Actualizar el JWT en authStore con el nuevo token
            //    Esto actualiza user.id_empresa, es_admin_empresa, etc.
            useAuthStore.getState().setToken(response.token);

            // 2. Actualizar la empresa activa en el store sin recargar la página
            const newCurrent = get().companies.find(
                (c) => c.id_empresa === response.id_empresa
            ) ?? { id_empresa: response.id_empresa, nombre: response.nombre_empresa };

            set({ currentCompany: newCurrent });

        } catch (error) {
            console.error("Error al cambiar empresa:", error);
            throw error; // Re-lanzar para que el componente pueda mostrar el error
        } finally {
            set({ isLoading: false });
        }
    },
}));