import { Clock, Gauge, Navigation } from "lucide-react";
import {
    getTelemetryStatusLabel,
    getTelemetryMapState,
} from "@/features/maps/lib/telemetry-status";
import type { EngineState } from "@/features/maps/types/map.types";
import { tiempoRelativo } from "../lib/public-track-format";
import type { PublicTrackResponse } from "../publicTrackService";

interface PublicTrackCardProps {
    data: PublicTrackResponse | null;
    loading: boolean;
}

// Punto de color del estado, alineado a la semántica del mapa interno
// (verde=movimiento, ámbar=detenido, rojo=apagado, gris=sin señal).
const dotClassPorEstado = (mapState: string): string => {
    if (mapState === "movimiento") return "bg-emerald-500";
    if (mapState === "detenido") return "bg-amber-400";
    if (mapState === "apagado") return "bg-rose-400";
    return "bg-slate-400";
};

// Tarjeta flotante inferior (bottom-sheet) del rastreo público. Componente
// puro de presentación: recibe los datos ya resueltos y solo pinta.
export const PublicTrackCard = ({
    data,
    loading,
}: PublicTrackCardProps) => {
    const pos = data?.posicion;
    const sinSenal = !pos || pos.latitud == null || pos.longitud == null;
    const engineState = (pos?.engine_state ?? "unknown") as EngineState;
    const estadoLabel = getTelemetryStatusLabel(engineState, pos?.velocidad);
    const mapState = getTelemetryMapState(engineState, pos?.velocidad);

    return (
        <div className="absolute inset-x-4 bottom-4 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
            {loading ? (
                <p className="py-2 text-center text-sm text-slate-400">
                    Cargando rastreo…
                </p>
            ) : (
                <>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50">
                            <Navigation className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold text-slate-800">
                                Unidad {data?.unidad.numero}
                                {data?.unidad.marca
                                    ? ` · ${data.unidad.marca}`
                                    : ""}
                                {data?.unidad.modelo
                                    ? ` ${data.unidad.modelo}`
                                    : ""}
                            </p>
                            {!sinSenal && (
                                <div className="mt-0.5 flex items-center gap-1.5">
                                    <span
                                        className={`inline-block h-2 w-2 rounded-full ${dotClassPorEstado(mapState)}`}
                                    />
                                    <span className="text-sm text-slate-500">
                                        {estadoLabel}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {sinSenal ? (
                        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                            Esta unidad aún no ha reportado su ubicación. En
                            cuanto envíe señal, aparecerá aquí.
                        </p>
                    ) : (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                    <Clock className="h-3 w-3" />
                                    Última señal
                                </div>
                                <p className="mt-0.5 text-sm font-medium text-slate-700">
                                    {tiempoRelativo(pos?.fecha_hora_gps ?? null)}
                                </p>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                    <Gauge className="h-3 w-3" />
                                    Velocidad
                                </div>
                                <p className="mt-0.5 text-sm font-medium text-slate-700">
                                    {pos?.velocidad == null
                                        ? "—"
                                        : `${Math.round(pos.velocidad)} km/h`}
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};