import { ChevronRight } from "lucide-react";
import type { DashboardTopUnidad } from "../types/dashboard.types";

interface TopUnitsTableProps {
    unidades: DashboardTopUnidad[];
    loading?: boolean;
    // Si true, se muestra la columna de excesos (desktop) o el texto de excesos (móvil).
    mostrarExcesos: boolean;
    onUnidadClick: (unidad: DashboardTopUnidad) => void;
}

// Formato compacto de minutos para celdas ("4 h 50 m", "47 m").
const formatMinutosCorto = (minutos: number): string => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return h === 0 ? `${m} m` : `${h} h ${m.toString().padStart(2, "0")} m`;
};

const nombreUnidad = (u: DashboardTopUnidad): string => {
    const marcaModelo = [u.marca, u.modelo].filter(Boolean).join(" ");
    return marcaModelo ? `${u.numero} · ${marcaModelo}` : u.numero;
};

// Componente que muestra una tabla con las unidades más destacadas del periodo seleccionado.
export const TopUnitsTable = ({
    unidades,
    loading = false,
    mostrarExcesos,
    onUnidadClick,
}: TopUnitsTableProps) => {
    if (loading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
                <div className="mb-4 h-4 w-40 animate-pulse rounded bg-slate-200" />
                <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-10 animate-pulse rounded-lg bg-slate-100"
                        />
                    ))}
                </div>
            </div>
        );
    }

    const conActividad = unidades.filter(
        (u) => u.km > 0 || u.minutos_uso > 0 || u.excesos > 0,
    );

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
            <p className="mb-3 text-sm font-semibold text-slate-700">
                Unidades destacadas
            </p>

            {conActividad.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                    Sin actividad de unidades en este periodo.
                </p>
            ) : (
                <>
                    {/* Desktop */}
                    <table className="hidden w-full border-collapse text-sm md:table">
                        <thead>
                            <tr className="text-left text-xs text-slate-400">
                                <th className="pb-2 font-normal">Unidad</th>
                                <th className="pb-2 text-right font-normal">
                                    Kilómetros
                                </th>
                                <th className="pb-2 text-right font-normal">
                                    Uso
                                </th>
                                {mostrarExcesos && (
                                    <th className="pb-2 text-right font-normal">
                                        Excesos
                                    </th>
                                )}
                                <th className="w-8 pb-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {conActividad.map((u) => (
                                <tr
                                    key={u.id}
                                    onClick={() => onUnidadClick(u)}
                                    className="group cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                                >
                                    <td className="py-2.5 font-medium text-slate-700">
                                        {nombreUnidad(u)}
                                    </td>
                                    <td className="py-2.5 text-right tabular-nums text-slate-600">
                                        {u.km.toLocaleString("es-MX")} km
                                    </td>
                                    <td className="py-2.5 text-right tabular-nums text-slate-600">
                                        {formatMinutosCorto(u.minutos_uso)}
                                    </td>
                                    {mostrarExcesos && (
                                        <td
                                            className={`py-2.5 text-right tabular-nums ${u.excesos > 0
                                                    ? "font-medium text-rose-600"
                                                    : "text-slate-300"
                                                }`}
                                        >
                                            {u.excesos > 0 ? u.excesos : "—"}
                                        </td>
                                    )}
                                    <td className="py-2.5 pl-2 text-right">
                                        <ChevronRight className="ml-auto h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Móvil */}
                    <ul className="divide-y divide-slate-100 md:hidden">
                        {conActividad.map((u) => (
                            <li key={u.id}>
                                <button
                                    type="button"
                                    onClick={() => onUnidadClick(u)}
                                    className="flex w-full items-center gap-3 py-3 text-left active:bg-slate-50"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-700">
                                            {nombreUnidad(u)}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-400">
                                            {formatMinutosCorto(u.minutos_uso)}{" "}
                                            de uso
                                            {mostrarExcesos && u.excesos > 0 && (
                                                <span className="text-rose-500">
                                                    {" "}
                                                    · {u.excesos} exceso
                                                    {u.excesos !== 1 ? "s" : ""}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-700">
                                        {u.km.toLocaleString("es-MX")}{" "}
                                        <span className="text-xs font-normal text-slate-400">
                                            km
                                        </span>
                                    </p>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
};