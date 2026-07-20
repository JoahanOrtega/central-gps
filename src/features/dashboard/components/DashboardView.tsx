import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bus,
  CalendarDays,
  Car,
  Clock,
  Gauge,
  MapPin,
  Bell,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Route,
} from "lucide-react";
import { monitorService } from "@/features/maps/services/monitorService";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { usePermisos } from "@/hooks/usePermiso";
import { queryKeys } from "@/lib/query-keys";
import { APP_TIMEZONE } from "@/lib/date-time";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import type { DashboardPeriodo } from "../types/dashboard.types";
import { PeriodSelector } from "./PeriodSelector";
import { KpiCard } from "./KpiCard";
import { KmActivityChart } from "./KmActivityChart";
import { TopUnitsTable } from "./TopUnitsTable";

// Permisos requeridos para mostrar el dashboard completo (KPI + gráfica + top unidades).
const PERMISOS_DASHBOARD = [
  "dashboard.kilometros",
  "dashboard.utilizacion",
  "dashboard.excesos_velocidad",
  "dashboard.widgets_resumen",
];

// Helpers de formato

const fechaHoy = (): string =>
  new Intl.DateTimeFormat("es-MX", {
    timeZone: APP_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

// Formato de minutos para celdas ("4 h 50 m", "47 m").
const formatMinutos = (minutos: number): string => {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} m`;
  return `${h} h ${m.toString().padStart(2, "0")} m`;
};

// Componente principal

export const DashboardView = () => {
  const navigate = useNavigate();
  const { idEmpresa } = useEmpresaActiva();
  const permisos = usePermisos(PERMISOS_DASHBOARD);

  const [periodo, setPeriodo] = useState<DashboardPeriodo>("hoy");

  // Métricas en tiempo real (unidades encendidas, apagadas y sin señal).
  const { data: live, isLoading: loadingLive } = useQuery({
    queryKey: queryKeys.monitor.unitsLive(idEmpresa, ""),
    queryFn: () => monitorService.getUnitsLive("", idEmpresa),
    enabled: !!idEmpresa,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Métricas del periodo seleccionado (km, uso, excesos, top unidades).
  const {
    data: resumen,
    isLoading: loadingResumen,
    isError: errorResumen,
    refetch: refetchResumen,
  } = useDashboardSummary(idEmpresa, periodo);

  const counts = live?.counts;
  const total = counts?.total ?? 0;
  const encendidas = counts?.engine_on ?? 0;
  const apagadas = counts?.engine_off ?? 0;
  const sinSenal = counts?.engine_unknown ?? 0;

  const km = resumen?.kilometros;
  const uso = resumen?.uso;
  const excesos = resumen?.excesos;
  const minutosUso = (uso?.minutos_movimiento ?? 0) + (uso?.minutos_ralenti ?? 0);
  const hayExcesos = (excesos?.eventos ?? 0) > 0;

  return (
    <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
      <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">

        {/* Header con selector de periodo */}
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div className="flex items-center gap-3">
            <Bus className="h-5 w-5 text-slate-500" />
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
              <p className="text-xs text-slate-400">Monitor de flota</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 lg:flex">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="capitalize">{fechaHoy()}</span>
            </div>
            <PeriodSelector value={periodo} onChange={setPeriodo} />
          </div>
        </div>

        {/* Error accionable */}
        {errorResumen && (
          <div className="flex flex-col items-center gap-2 border-b border-slate-200 bg-rose-50/50 px-6 py-4 text-center">
            <p className="text-sm text-rose-600">
              No se pudieron cargar las métricas del periodo.
            </p>
            <button
              type="button"
              onClick={() => refetchResumen()}
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reintentar
            </button>
          </div>
        )}

        {/* Tarjetas KPI */}
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 border-b border-slate-200 xl:grid-cols-4 xl:divide-y-0">
          <KpiCard
            icono={<Car className="h-4 w-4" />}
            titulo="Unidades"
            valor={String(encendidas)}
            sufijo={`de ${total}`}
            subtitulo={`${apagadas} apagadas · ${sinSenal} sin señal`}
            loading={loadingLive}
            hint="Ver el mapa en tiempo real"
            onClick={() => navigate("/home/maps")}
          />

          {permisos["dashboard.kilometros"] && (
            <KpiCard
              icono={<Route className="h-4 w-4" />}
              titulo="Kilómetros"
              valor={errorResumen ? "—" : (km?.total ?? 0).toLocaleString("es-MX")}
              sufijo={errorResumen ? undefined : "km"}
              subtitulo={errorResumen ? "Sin datos" : `${km?.unidades_con_km ?? 0} unidades con recorrido`}
              loading={loadingResumen}
              hint="Ver reporte de kilómetros"
              onClick={() => navigate("/home/reports")}
            />
          )}

          {permisos["dashboard.utilizacion"] && (
            <KpiCard
              icono={<Clock className="h-4 w-4" />}
              titulo="Horas de uso"
              valor={errorResumen ? "—" : formatMinutos(minutosUso)}
              subtitulo={errorResumen ? "Sin datos" : `${formatMinutos(uso?.minutos_movimiento ?? 0)} movimiento · ${formatMinutos(uso?.minutos_ralenti ?? 0)} ralentí`}
              loading={loadingResumen}
              hint="Ver reporte de utilización"
              onClick={() => navigate("/home/reports")}
            />
          )}

          {permisos["dashboard.excesos_velocidad"] && (
            <KpiCard
              icono={<Gauge className="h-4 w-4" />}
              titulo="Excesos velocidad"
              valor={errorResumen ? "—" : String(excesos?.eventos ?? 0)}
              subtitulo={
                errorResumen
                  ? "Sin datos"
                  : hayExcesos
                    ? `${excesos?.unidades} unidades · ${formatMinutos(excesos?.minutos ?? 0)}`
                    : "Sin excesos en el periodo"
              }
              tonoValor={hayExcesos ? "text-rose-600" : "text-slate-800"}
              loading={loadingResumen}
              hint="Ver reporte de excesos"
              onClick={() => navigate("/home/reports")}
            />
          )}
        </div>

        {/* Gráfica de actividad */}
        {permisos["dashboard.kilometros"] && !errorResumen && (
          <div className="border-b border-slate-200 p-4 md:p-6">
            <KmActivityChart
              serie={resumen?.serie ?? []}
              periodo={periodo}
              loading={loadingResumen}
            />
          </div>
        )}

        {/* Unidades destacadas */}
        {permisos["dashboard.widgets_resumen"] && !errorResumen && (
          <div className="border-b border-slate-200 p-4 md:p-6">
            <TopUnitsTable
              unidades={resumen?.top_unidades ?? []}
              loading={loadingResumen}
              mostrarExcesos={permisos["dashboard.excesos_velocidad"]}
              onUnidadClick={(u) => navigate(`/home/maps?unidad=${u.id}`)}
            />
          </div>
        )}

        {/* Accesos rápidos */}
        <div className="flex-1 p-4 md:p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Accesos rápidos
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickAccessCard
              icon={<MapPin className="h-5 w-5 text-sky-500" />}
              titulo="Ver mapa en vivo"
              descripcion={`${encendidas} unidad${encendidas !== 1 ? "es" : ""} encendida${encendidas !== 1 ? "s" : ""} ahora mismo`}
              onClick={() => navigate("/home/maps")}
              badge={encendidas > 0 ? String(encendidas) : undefined}
              badgeColor="bg-emerald-500"
            />
            <QuickAccessCard
              icon={<Bell className="h-5 w-5 text-amber-500" />}
              titulo="Eventos de geocerca"
              descripcion="Historial de entradas, salidas y alertas de velocidad"
              onClick={() => navigate("/home/reports")}
            />
            <QuickAccessCard
              icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
              titulo="Reportes de flota"
              descripcion="Kilómetros, tiempos de uso y análisis de recorridos"
              onClick={() => navigate("/home/reports")}
            />
          </div>
        </div>
      </section>
    </main>
  );
};

// Componente de tarjeta de acceso rápido
interface QuickAccessCardProps {
  icon: React.ReactNode;
  titulo: string;
  descripcion: string;
  onClick: () => void;
  badge?: string;
  badgeColor?: string;
}

const QuickAccessCard = ({
  icon,
  titulo,
  descripcion,
  onClick,
  badge,
  badgeColor = "bg-blue-500",
}: QuickAccessCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all duration-150 hover:border-blue-200 hover:bg-blue-50/30"
  >
    <div className="relative shrink-0">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 transition-colors group-hover:bg-white">
        {icon}
      </div>
      {badge && (
        <span className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${badgeColor}`}>
          {badge}
        </span>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-slate-700 transition-colors group-hover:text-blue-700">
        {titulo}
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
        {descripcion}
      </p>
    </div>
    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
  </button>
);