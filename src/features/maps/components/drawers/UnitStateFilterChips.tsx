// ══════════════════════════════════════════════════════════════════════════════
// UnitStateFilterChips.tsx — Filtros rápidos por estado de unidad
// ══════════════════════════════════════════════════════════════════════════════
//
// El operador de flotilla casi siempre pregunta "¿cuáles están mal?" o
// "¿cuáles se están moviendo?", no busca una unidad por nombre. Estos chips
// responden esa pregunta en un clic (Nielsen #7 — flexibilidad y eficiencia
// de uso) y de paso funcionan como mini-dashboard: los conteos por estado
// son visibles sin interacción (Nielsen #1 — visibilidad del estado).
//
// ── Convención visual de chip activo/inactivo ─────────────────────────────────
// Activo   → relleno sólido con texto blanco (no hay duda de cuál está activo)
// Inactivo → borde + texto gris (disponible pero no aplicado)
// Misma convención que Google Maps / Gmail usan en sus chips de filtro
// (Ley de Jakob: el usuario ya conoce el patrón).
//
// ── Por qué los conteos se calculan aquí y no vienen del backend ──────────────
// El backend entrega engine_on/engine_off/engine_unknown, pero los chips
// distinguen "En movimiento" de "Relentí" (ambas engine_on). Calcular los
// 4 conteos en el cliente con useMemo cuesta un solo pase O(n) sobre las
// unidades ya cargadas — más barato que un campo nuevo en la API.
// ══════════════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import type { MapUnitItem } from "../../types/map.types";
import { getTelemetryMapState } from "../../lib/telemetry-status";

// ── Tipo del filtro ───────────────────────────────────────────────────────────
// "all" + los estados lógicos agrupados para la UI.
// "apagado-prolongado" se agrupa dentro de "apagado": para el filtro, el
// usuario piensa en "las apagadas" como un solo conjunto; el detalle del
// prolongado ya lo comunica el color rojo del marcador y el dot de la fila.
export type UnitStateFilter =
    | "all"
    | "movimiento"
    | "detenido"
    | "apagado"
    | "sin-telemetria";

/**
 * Estado lógico de una unidad normalizado al dominio del filtro.
 * Exportado para que UnitsDrawer use EXACTAMENTE la misma clasificación
 * al filtrar la lista (una sola fuente de verdad — si la regla cambia,
 * chips y filtro siempre coinciden).
 */
export const getUnitFilterState = (
    unit: MapUnitItem,
): Exclude<UnitStateFilter, "all"> => {
    const mapState = getTelemetryMapState(
        unit.engine_state,
        unit.telemetry?.velocidad,
    );
    // Agrupar prolongado dentro de apagado (ver nota del encabezado)
    if (mapState === "apagado-prolongado") return "apagado";
    return mapState;
};

// ── Definición de los chips ───────────────────────────────────────────────────
// El orden sigue la prioridad operativa: primero lo que se mueve,
// al final lo que no reporta.
interface ChipDef {
    value: UnitStateFilter;
    label: string;
    /** Clases Tailwind cuando el chip está ACTIVO (relleno sólido). */
    activeClass: string;
    /** Color del dot indicador cuando está inactivo. */
    dotClass: string;
}

const CHIP_DEFS: ChipDef[] = [
    {
        value: "all",
        label: "Todas",
        activeClass: "bg-slate-700 border-slate-700 text-white",
        dotClass: "",
    },
    {
        value: "movimiento",
        label: "Movimiento",
        activeClass: "bg-emerald-500 border-emerald-500 text-white",
        dotClass: "bg-emerald-500",
    },
    {
        value: "detenido",
        label: "Relentí",
        activeClass: "bg-amber-400 border-amber-400 text-white",
        dotClass: "bg-amber-400",
    },
    {
        value: "apagado",
        label: "Apagadas",
        activeClass: "bg-neutral-800 border-neutral-800 text-white",
        dotClass: "bg-neutral-800",
    },
    {
        value: "sin-telemetria",
        label: "Sin señal",
        activeClass: "bg-slate-400 border-slate-400 text-white",
        dotClass: "bg-slate-400",
    },
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface UnitStateFilterChipsProps {
    /** Lista completa de unidades (sin filtrar) para calcular conteos. */
    units: MapUnitItem[];
    /** Filtro actualmente activo. */
    value: UnitStateFilter;
    /** Callback al seleccionar un chip. */
    onChange: (filter: UnitStateFilter) => void;
}

/**
 * Fila horizontal de chips de filtro por estado con conteos en vivo.
 *
 * Comportamiento:
 *   - Clic en un chip lo activa y filtra la lista.
 *   - Clic en el chip ya activo regresa a "Todas" (toggle — el usuario
 *     no necesita buscar el chip "Todas" para deshacer, Nielsen #3).
 *   - Chips con conteo 0 se deshabilitan visualmente: no tiene sentido
 *     filtrar hacia un conjunto vacío (prevención de errores, Nielsen #5).
 */
export const UnitStateFilterChips = ({
    units,
    value,
    onChange,
}: UnitStateFilterChipsProps) => {
    // Conteos por estado en un solo pase O(n), memoizado por referencia
    // de units (estable entre renders gracias al hook useUnitsLive).
    const countsByState = useMemo(() => {
        const acc: Record<Exclude<UnitStateFilter, "all">, number> = {
            movimiento: 0,
            detenido: 0,
            apagado: 0,
            "sin-telemetria": 0,
        };
        for (const unit of units) {
            acc[getUnitFilterState(unit)] += 1;
        }
        return acc;
    }, [units]);

    const getCount = (chip: UnitStateFilter): number =>
        chip === "all" ? units.length : countsByState[chip];

    return (
        <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Filtrar unidades por estado"
        >
            {CHIP_DEFS.map((chip) => {
                const count = getCount(chip.value);
                const isActive = value === chip.value;
                const isEmpty = count === 0 && chip.value !== "all";

                return (
                    <button
                        key={chip.value}
                        type="button"
                        disabled={isEmpty}
                        aria-pressed={isActive}
                        onClick={() => onChange(isActive ? "all" : chip.value)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${isActive
                            ? chip.activeClass
                            : isEmpty
                                ? "cursor-not-allowed border-slate-200 text-slate-300"
                                : "border-slate-300 text-slate-600 hover:bg-slate-50"
                            }`}
                    >
                        {/* Dot de color solo en chips inactivos con estado asociado:
                cuando está activo, el relleno del chip YA es el color */}
                        {!isActive && chip.dotClass && !isEmpty && (
                            <span
                                aria-hidden="true"
                                className={`h-1.5 w-1.5 rounded-full ${chip.dotClass}`}
                            />
                        )}
                        {chip.label}
                        <span
                            className={`font-bold ${isActive ? "text-white/90" : isEmpty ? "text-slate-300" : "text-slate-400"
                                }`}
                        >
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};