import { useMemo } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { parseApiDate } from "@/lib/date-time";
import type {
    DashboardPeriodo,
    DashboardSeriePunto,
} from "../types/dashboard.types";

interface KmActivityChartProps {
    serie: DashboardSeriePunto[];
    periodo: DashboardPeriodo;
    loading?: boolean;
}

// Etiqueta del eje X según la granularidad del bucket:
//   hoy → hora ("8:00"), 7d → día de semana ("lun 14"), 30d → día ("14 jul").
const formatearEtiqueta = (bucket: string, periodo: DashboardPeriodo): string => {
    const fecha = parseApiDate(bucket);
    if (!fecha) return "";

    if (periodo === "hoy") {
        return new Intl.DateTimeFormat("es-MX", {
            hour: "numeric",
            minute: "2-digit",
        }).format(fecha);
    }
    if (periodo === "7d") {
        return new Intl.DateTimeFormat("es-MX", {
            weekday: "short",
            day: "numeric",
        }).format(fecha);
    }
    return new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "short",
    }).format(fecha);
};

export const KmActivityChart = ({
    serie,
    periodo,
    loading = false,
}: KmActivityChartProps) => {
    const datos = useMemo(
        () =>
            serie.map((p) => ({
                etiqueta: formatearEtiqueta(p.bucket, periodo),
                km: p.km,
            })),
        [serie, periodo],
    );

    const sinActividad = !loading && datos.every((d) => d.km === 0);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
            <p className="mb-3 text-sm font-semibold text-slate-700">
                Kilómetros {periodo === "hoy" ? "por hora" : "por día"}
            </p>

            {loading ? (
                <div className="h-[220px] animate-pulse rounded-lg bg-slate-100" />
            ) : sinActividad ? (
                // Empty state útil, no un hueco en blanco (Nielsen #1)
                <div className="flex h-[220px] items-center justify-center">
                    <p className="text-sm text-slate-400">
                        Sin recorridos registrados en este periodo.
                    </p>
                </div>
            ) : (
                <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={datos}
                            margin={{ top: 4, right: 4, bottom: 0, left: -18 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#e2e8f0"
                            />
                            <XAxis
                                dataKey="etiqueta"
                                tick={{ fontSize: 11, fill: "#94a3b8" }}
                                tickLine={false}
                                axisLine={{ stroke: "#e2e8f0" }}
                                // En 30 días caben ~30 barras: dejar que recharts
                                // salte etiquetas evita el amontonamiento en móvil.
                                interval="preserveStartEnd"
                                minTickGap={18}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: "#94a3b8" }}
                                tickLine={false}
                                axisLine={false}
                                width={52}
                                tickFormatter={(v: number) => `${v} km`}
                            />
                            <Tooltip
                                cursor={{ fill: "#f1f5f9" }}
                                formatter={(value) => [
                                    `${Number(value).toFixed(1)} km`,
                                    "Recorrido",
                                ]}
                                contentStyle={{
                                    borderRadius: 8,
                                    border: "1px solid #e2e8f0",
                                    fontSize: 12,
                                }}
                            />
                            <Bar
                                dataKey="km"
                                fill="#38bdf8"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={36}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};