// ─────────────────────────────────────────────────────────────────────────────
// ItineraryCard — tarjeta de un itinerario en el catálogo
//
// Mejoras UX v2 (adoptadas del análisis de la v3.0):
//   - Días como resumen de rangos ("Lun a Vie") en lugar de 7 chips —
//     reduce ruido visual y se lee de un vistazo (ley de Hick).
//   - Horario como elemento principal de la card: es el dato que el
//     operador busca primero al escanear turnos.
//   - Direcciones origen → destino visibles cuando existen.
// ─────────────────────────────────────────────────────────────────────────────

import { Clock, MapPin, Pencil, Trash2, CalendarDays, CalendarRange } from "lucide-react";
import { KebabMenu } from "@/components/shared";
import type { ItinerarioItem } from "./itinerary.types";
import { formatWeekdaySummary } from "./weekday-summary.ts";

interface ItineraryCardProps {
    itinerario: ItinerarioItem;
    canEdit?: boolean;
    canDelete?: boolean;
    onEdit?: (idItinerario: number) => void;
    onDelete?: (itinerario: ItinerarioItem) => void;
}

// Formatea duración en segundos a "Xh YYmin"
const formatDuracion = (segundos: number | null): string => {
    if (!segundos) return "—";
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${String(m).padStart(2, "0")} min`;
};

export const ItineraryCard = ({
    itinerario,
    canEdit = false,
    canDelete = false,
    onEdit,
    onDelete,
}: ItineraryCardProps) => {
    const menuItems = [
        canEdit && {
            id: "edit",
            label: "Editar",
            icon: Pencil,
            onClick: () => onEdit?.(itinerario.id_itinerario),
        },
        canDelete && {
            id: "delete",
            label: "Eliminar",
            icon: Trash2,
            variant: "destructive" as const,
            onClick: () => onDelete?.(itinerario),
        },
    ].filter(Boolean) as React.ComponentProps<typeof KebabMenu>["items"];

    const esEspecial = itinerario.tipo === 2;
    const esVuelta = itinerario.tipo_logistica === 2;

    return (
        <article className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            {/* Barra de color del trazo — borde izquierdo completo */}
            <div
                className="absolute inset-y-0 left-0 w-1"
                style={{ backgroundColor: itinerario.trace_color ?? "#2563eb" }}
                aria-hidden="true"
            />

            <div className="p-5 pl-6">
                {/* Encabezado: turno + badges + menú */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-800">
                            Turno {itinerario.turno}
                        </h3>
                        <span
                            className={[
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                esVuelta
                                    ? "bg-violet-50 text-violet-700"
                                    : "bg-emerald-50 text-emerald-700",
                            ].join(" ")}
                        >
                            {esVuelta ? "Vuelta" : "Ida"}
                        </span>
                        {esEspecial && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                Especial
                            </span>
                        )}
                    </div>

                    {menuItems.length > 0 && (
                        <KebabMenu items={menuItems} entityName={`Turno ${itinerario.turno}`} />
                    )}
                </div>

                {/* Horario — el dato principal del turno, en grande */}
                <div className="mt-3 flex items-baseline gap-2">
                    <Clock className="h-4 w-4 shrink-0 self-center text-slate-400" aria-hidden="true" />
                    <span className="text-2xl font-semibold tabular-nums text-slate-800">
                        {itinerario.hora_inicio ?? "--:--"}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="text-2xl font-semibold tabular-nums text-slate-800">
                        {itinerario.hora_fin ?? "--:--"}
                    </span>
                    <span className="ml-1 text-sm text-slate-400">
                        ({formatDuracion(itinerario.duracion_segundos)})
                    </span>
                </div>

                {/* Días resumidos como rango */}
                <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                    <CalendarRange className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    <span>{formatWeekdaySummary(itinerario.dias)}</span>
                </div>

                {/* Pie: paradas + vigencia */}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                        {itinerario.total_paradas} parada{itinerario.total_paradas !== 1 ? "s" : ""}
                    </span>
                    {itinerario.fecha_inicio && (
                        <span className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                            {itinerario.fecha_inicio}
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
};