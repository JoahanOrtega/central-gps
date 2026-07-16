// Filtro por estado de unidad 
import { useMemo } from "react";
import type { MapUnitItem } from "../../types/map.types";
import { getTelemetryMapState } from "../../lib/telemetry-status";

export type UnitStateFilter =
    | "all"
    | "movimiento"
    | "detenido"
    | "apagado"
    | "sin-telemetria";

/**
 * Devuelve el estado de filtro de la unidad según su engine_state y velocidad.
 * - Agrupa "prolongado" dentro de "apagado" para simplificar la UI.
 */
export const getUnitFilterState = (
    unit: MapUnitItem,
): Exclude<UnitStateFilter, "all"> => {
    const mapState = getTelemetryMapState(
        unit.engine_state,
        unit.telemetry?.velocidad,
    );
    if (mapState === "sin-reporte") return "sin-telemetria";
    return mapState;
};

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

// Props
interface UnitStateFilterChipsProps {
    /** Lista completa de unidades (sin filtrar) para calcular conteos. */
    units: MapUnitItem[];
    /** Filtro actualmente activo. */
    value: UnitStateFilter;
    /** Callback al seleccionar un chip. */
    onChange: (filter: UnitStateFilter) => void;
}

/**
 * Componente de chips para filtrar unidades por estado.
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