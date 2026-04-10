import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
    sub: string;
    username: string;
    perfil: number;
    id_empresa: number | null;
    exp: number;
    iat: number;
}

interface AuthState {
    token: string | null;
    user: AuthUser | null;
    setToken: (token: string | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            setToken: (token) => {
                console.log('setToken called with token:', token ? token.substring(0, 20) + '...' : null);

                if (!token) {
                    set({ token: null, user: null });
                    return;
                }
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    set({ token, user: payload });
                } catch {
                    set({ token, user: null });
                }
            },
            logout: () => set({ token: null, user: null }),
        }),
        {
            name: 'auth-storage',
        }
    )
);