/**
 * poisDrawerStore.ts — Estado persistente del panel de Puntos de Interés.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Problema que resuelve
 * ═══════════════════════════════════════════════════════════════════════════
 * Cuando el `PoisDrawer` se cierra, React desmonta el componente y con él
 * el hook `usePoisDrawer`. Eso provocaba que la selección del usuario
 * (checkboxes marcados, texto del buscador) se perdiera al reabrir.
 *
 * Este store mueve ese estado "fuera" del ciclo de vida del componente,
 * manteniéndolo vivo durante toda la sesión del usuario en el mapa.
 *
 * Mismo patrón que `unitsDrawerStore` — el objetivo es consistencia
 * arquitectónica entre los 3 drawers del mapa (Units, Pois, Trips).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Qué vive acá (estado que debe sobrevivir al desmontaje)
 * ═══════════════════════════════════════════════════════════════════════════
 *   - selectedPoiIds: POIs marcados con checkbox
 *   - search:         texto del input de búsqueda
 *   - lastEmpresaId:  última empresa procesada — distingue remount de cambio
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Qué NO vive acá (queda en usePoisDrawer, se re-obtiene al montar)
 * ═══════════════════════════════════════════════════════════════════════════
 *   - pois:             lista de POIs del backend
 *   - isLoading, error: estados efímeros de red
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Ciclo de vida y limpieza
 * ═══════════════════════════════════════════════════════════════════════════
 * - Al cambiar empresa real: el hook detecta el cambio comparando
 *   `lastEmpresaId` con el `idEmpresa` actual, y llama a `reset()`.
 * - Al remount del componente (cerrar+reabrir panel): el hook lee
 *   `lastEmpresaId` del store (que sobrevivió), ve que coincide con
 *   `idEmpresa`, y NO resetea. La selección se preserva.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Leyes UX aplicadas
 * ═══════════════════════════════════════════════════════════════════════════
 *   User Control (Nielsen #3) → cerrar no pierde el trabajo del usuario
 *   Consistency (Nielsen #4)  → mismo patrón que unitsDrawerStore
 *   Recognition (Nielsen #6)  → al reabrir, el usuario ve su estado previo
 */
import { create } from "zustand";

interface PoisDrawerState {
    /** IDs de POIs marcados con checkbox. */
    selectedPoiIds: number[];

    /** Texto actual del input de búsqueda. */
    search: string;

    /**
     * ID de la última empresa procesada. Permite al hook distinguir:
     *   - Primer mount / remount sin cambio de empresa → preserva selección
     *   - Cambio real de empresa → resetea selección
     * Null solo antes del primer mount absoluto.
     */
    lastEmpresaId: string | null;

    /** Alterna la selección de un POI por id. */
    togglePoi: (id: number) => void;

    /** Sobreescribe el set completo de ids seleccionados. */
    setSelectedPoiIds: (ids: number[]) => void;

    /** Actualiza el texto del buscador. */
    setSearch: (search: string) => void;

    /** Limpia la selección (NO borra el texto del buscador). */
    clearSelection: () => void;

    /** Actualiza el tracking de empresa activa (lo usa el hook). */
    setLastEmpresaId: (id: string | null) => void;

    /** Reset total: selección + search. Mantiene lastEmpresaId. */
    reset: () => void;
}

export const usePoisDrawerStore = create<PoisDrawerState>((set) => ({
    selectedPoiIds: [],
    search: "",
    lastEmpresaId: null,

    togglePoi: (id) =>
        set((state) => ({
            // Inmutable: nuevo array en cada toggle.
            selectedPoiIds: state.selectedPoiIds.includes(id)
                ? state.selectedPoiIds.filter((existingId) => existingId !== id)
                : [...state.selectedPoiIds, id],
        })),

    setSelectedPoiIds: (ids) => set({ selectedPoiIds: ids }),

    setSearch: (search) => set({ search }),

    clearSelection: () => set({ selectedPoiIds: [] }),

    setLastEmpresaId: (id) => set({ lastEmpresaId: id }),

    reset: () => set({ selectedPoiIds: [], search: "" }),
}));