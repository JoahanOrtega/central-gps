// Chips de tipos de evento agrupados por familia (geocerca / velocidad global).
// SRP: maneja solo la presentación y los toggles. La lógica de qué hacer con
// los tipos seleccionados vive en useEventosFilters.
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
    TIPOS_EVENTO_CONFIG,
    GRUPOS_EVENTO,
    type TipoEventoGeocerca,
} from "../types/eventos.types";

interface EventTypeChipsProps {
    selected: TipoEventoGeocerca[];
    onToggle: (tipo: TipoEventoGeocerca) => void;
    onToggleGroup: (tipos: TipoEventoGeocerca[], allActive: boolean) => void;
    onClearAll: () => void;
}

type GrupoEntry = readonly [
    keyof typeof GRUPOS_EVENTO,
    {
        readonly label: string;
        readonly tipos: ReadonlyArray<{
            readonly tipo: TipoEventoGeocerca;
            readonly cfg: (typeof TIPOS_EVENTO_CONFIG)[TipoEventoGeocerca];
        }>;
    },
];

/**
 * Pre-agrupa los tipos por familia. Se memoiza porque TIPOS_EVENTO_CONFIG
 * es estático — no tiene sentido recalcular cada render.
 */
const useGruposIndexados = (): GrupoEntry[] => {
    return useMemo(() => {
        return (Object.entries(GRUPOS_EVENTO) as [keyof typeof GRUPOS_EVENTO, string][]).map(
            ([grupoId, label]) => {
                const tipos = (
                    Object.entries(TIPOS_EVENTO_CONFIG) as [
                        string,
                        (typeof TIPOS_EVENTO_CONFIG)[TipoEventoGeocerca],
                    ][]
                )
                    .filter(([, cfg]) => cfg.grupo === grupoId)
                    .map(([t, cfg]) => ({
                        tipo: Number(t) as TipoEventoGeocerca,
                        cfg,
                    }));

                return [grupoId, { label, tipos }] as const;
            },
        );
    }, []);
};

export const EventTypeChips = ({
    selected,
    onToggle,
    onToggleGroup,
    onClearAll,
}: EventTypeChipsProps) => {
    const grupos = useGruposIndexados();
    const hasSelection = selected.length > 0;

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Tipo de evento
                </label>
                {hasSelection && (
                    <button
                        type="button"
                        onClick={onClearAll}
                        className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
                    >
                        Limpiar
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {grupos.map(([grupoId, { label, tipos }]) => {
                    const idsGrupo = tipos.map((t) => t.tipo);
                    const allActive = idsGrupo.every((id) => selected.includes(id));

                    return (
                        <div key={grupoId}>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                                    {label}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onToggleGroup(idsGrupo, allActive)}
                                    className="text-xs text-slate-400 hover:text-blue-500 transition-colors"
                                >
                                    {allActive ? "Quitar" : "Todos"}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-1">
                                {tipos.map(({ tipo, cfg }) => {
                                    const activo = selected.includes(tipo);
                                    return (
                                        <button
                                            key={tipo}
                                            type="button"
                                            onClick={() => onToggle(tipo)}
                                            title={cfg.label}
                                            aria-pressed={activo}
                                            className={cn(
                                                "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-left transition-all",
                                                activo
                                                    ? `${cfg.bg} ${cfg.color} font-medium ring-1 ring-inset`
                                                    : "bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100",
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "h-1.5 w-1.5 shrink-0 rounded-full",
                                                    activo ? cfg.dot : "bg-slate-300",
                                                )}
                                            />
                                            <span className="truncate">{cfg.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};