import { create } from 'zustand';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from './authStore';

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
            const data = await apiFetch<Company[]>('/companies', { method: 'GET' });
            const currentCompanyId = useAuthStore.getState().user?.id_empresa;

            let selectedCompany = null;
            if (data.length > 0) {
                // Si el usuario ya tiene empresa en el token, usarla; si no, la primera
                selectedCompany = data.find(c => c.id_empresa === currentCompanyId) || data[0];
            }

            set({
                companies: data,
                currentCompany: selectedCompany,
                isLoading: false,
            });
        } catch (error) {
            console.error('Error fetching companies', error);
            set({ isLoading: false });
        }
    },

    switchCompany: async (companyId: number) => {
        set({ isLoading: true });
        try {
            const response = await apiFetch<{ token: string; id_empresa: number; nombre_empresa: string }>('/auth/switch-company', {
                method: 'POST',
                body: { id_empresa: companyId },
            });
            // Actualizar token en authStore
            useAuthStore.getState().setToken(response.token);
            // Recargar página para reiniciar datos con nueva empresa
            window.location.reload();
        } catch (error) {
            console.error('Error switching company', error);
            set({ isLoading: false });
        }
    },

}));