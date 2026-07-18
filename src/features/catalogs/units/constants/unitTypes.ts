/**
 * El campo `tipo` de `t_unidades` (smallint) almacena un entero cuyo
 * significado estaba duplicado e inconsistente entre dos componentes:
 *
 *   NewUnitGeneralStep.tsx  → 13 tipos, IDs 1–17 con saltos
 *   EditUnitGeneralTab.tsx  → 7 tipos, IDs 1–7 consecutivos, labels distintos
 *
 * Consecuencia real: una unidad creada con tipo 1 ("Camión") al abrirse
 * en el editor mostraba "Automóvil" — violación directa de la heurística
 * de consistencia de Nielsen (#4).
 *
 * Solución: este archivo es la única fuente de verdad. Ambos componentes
 * (alta y edición) lo importan. Cualquier cambio futuro al catálogo ocurre
 * aquí y se propaga automáticamente.
 *
 * Los IDs son los del alta original (v2.5 legacy), que son los que ya
 * existen en la base de datos. No cambiar los valores numéricos sin una
 * migración de BD.
 *
 * Uso:
 *   import { TIPOS_UNIDAD, labelTipoUnidad } from "@/features/catalogs/units/constants/unitTypes";
 */

export interface TipoUnidad {
    value: number;
    label: string;
}

/**
 * Catálogo completo de tipos. Los IDs coinciden con los valores
 * almacenados en t_unidades.tipo — no modificar sin migración de BD.
 * Orden: de mayor a menor frecuencia de uso en la flota típica.
 */
export const TIPOS_UNIDAD: TipoUnidad[] = [
    { value: 1, label: "Camión" },
    { value: 2, label: "Camioneta / Van" },
    { value: 7, label: "Automóvil" },
    { value: 14, label: "Pick Up" },
    { value: 5, label: "Camión de carga" },
    { value: 3, label: "Tracto Camión" },
    { value: 17, label: "Camión de Volteo" },
    { value: 8, label: "Motocicleta" },
    { value: 4, label: "Tractor" },
    { value: 6, label: "Grúa" },
    { value: 15, label: "Montacargas" },
    { value: 16, label: "Excavadora" },
    { value: 10, label: "Revolvedora" },
    { value: 12, label: "Auto de carga" },
];

/**
 * Devuelve el label legible de un tipo por su ID numérico.
 * Útil para mostrar el tipo en tablas, cards o tooltips sin un selector.
 *
 * @example
 *   labelTipoUnidad(1)   // "Camión"
 *   labelTipoUnidad(999) // "Tipo desconocido"
 */
export const labelTipoUnidad = (tipo: number | null | undefined): string => {
    if (tipo == null) return "—";
    return TIPOS_UNIDAD.find((t) => t.value === tipo)?.label ?? "Tipo desconocido";
};