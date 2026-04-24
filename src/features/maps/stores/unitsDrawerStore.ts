/**
 * unitsDrawerStore.ts — Estado persistente del panel de unidades en vivo.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Problema que resuelve
 * ═══════════════════════════════════════════════════════════════════════════
 * Cuando el `UnitsDrawer` se cierra, React desmonta el componente y con él
 * el hook `useUnitsLive`. Eso provocaba que la selección del usuario
 * (checkboxes marcados, texto del buscador) se perdiera al reabrir.
 *
 * Este store mueve ese estado "fuera" del ciclo de vida del componente,
 * manteniéndolo vivo durante toda la sesión del usuario en el mapa.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Qué vive acá (estado que debe sobrevivir al desmontaje)
 * ═══════════════════════════════════════════════════════════════════════════
 *   - selectedIds:   unidades con checkbox marcado
 *   - search:        texto del input de búsqueda
 *   - lastEmpresaId: ID de la última empresa procesada — permite al hook
 *                    distinguir mount inicial/remount vs cambio real de
 *                    empresa. Sin esto, cada vez que el componente se
 *                    montaba el hook borraba la selección.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Qué NO vive acá (queda en useUnitsLive, se re-obtiene al montar)
 * ═══════════════════════════════════════════════════════════════════════════
 *   - units, counts:    datos del backend, se refrescan con polling cada 15s
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
 *   User Control (Nielsen #3) → el usuario no pierde trabajo al cerrar
 *   Consistency (Nielsen #4)  → patrón aplicable a los 3 drawers
 *   Recognition (Nielsen #6)  → al reabrir, reconoce su estado previo
 */
import { create } from "zustand";

interface UnitsDrawerState {
    /** IDs de unidades marcadas con checkbox. */
    selectedIds: number[];

    /** Texto actual del input de búsqueda. */
    search: string;

    /**
     * ID de la última empresa procesada. Permite al hook distinguir:
     *   - Primer mount / remount sin cambio de empresa → preserva selección
     *   - Cambio real de empresa → resetea selección
     * Null solo antes del primer mount del hook.
     */
    lastEmpresaId: string | null;

    /** Alterna la selección de una unidad por id. */
    toggleUnit: (id: number) => void;

    /** Sobreescribe el set completo de ids seleccionados. */
    setSelectedIds: (ids: number[]) => void;

    /** Actualiza el texto del buscador. */
    setSearch: (search: string) => void;

    /** Limpia la selección (NO borra el texto del buscador). */
    clearSelection: () => void;

    /** Actualiza el tracking de empresa activa (lo usa el hook). */
    setLastEmpresaId: (id: string | null) => void;

    /** Reset total: selección + search. Mantiene lastEmpresaId. */
    reset: () => void;
}

export const useUnitsDrawerStore = create<UnitsDrawerState>((set) => ({
    selectedIds: [],
    search: "",
    lastEmpresaId: null,

    toggleUnit: (id) =>
        set((state) => ({
            // Inmutable: nuevo array, no mutamos el anterior.
            selectedIds: state.selectedIds.includes(id)
                ? state.selectedIds.filter((existingId) => existingId !== id)
                : [...state.selectedIds, id],
        })),

    setSelectedIds: (ids) => set({ selectedIds: ids }),

    setSearch: (search) => set({ search }),

    clearSelection: () => set({ selectedIds: [] }),

    setLastEmpresaId: (id) => set({ lastEmpresaId: id }),

    reset: () => set({ selectedIds: [], search: "" }),
}));