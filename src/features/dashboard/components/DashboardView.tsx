// Dashboard de monitoreo de flota con datos reales e interactivos.
//
// Lo que hacen Stripe, Amplitude y Mixpanel:
//   - Cada número es un punto de entrada, no solo un dato para leer.
//   - Hover: tooltip con contexto adicional (% del total, tendencia).
//   - Click: navega al detalle o filtra la vista de datos.
//   - Los datos NUNCA son estáticos — siempre reflejan el estado actual.
//   - Skeleton mientras carga: el usuario no ve "0" que parece un error.
//
// Datos reales que ya tiene el backend:
//   /monitor/units-live → counts: { total, engine_on, engine_off, engine_unknown }
//   Se reutiliza monitorService.getUnitsLive() que ya existe en el proyecto.
//

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bus, CalendarDays, MapPin, Bell, ArrowRight, TrendingUp } from "lucide-react";
import { monitorService } from "@/features/maps/services/monitorService";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { queryKeys } from "@/lib/query-keys";
import { formatAppDateTimeShort, APP_TIMEZONE } from "@/lib/date-time";

// ── Helper de fecha local ─────────────────────────────────────────────────────
const fechaHoy = (): string => {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: APP_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
};

// ── Skeleton de card de métrica ───────────────────────────────────────────────
const MetricCardSkeleton = () => (
  <article className="animate-pulse p-6">
    <div className="h-6 w-32 rounded bg-slate-200 mb-4" />
    <div className="space-y-3">
      <div className="flex justify-between">
        <div className="h-4 w-20 rounded bg-slate-200" />
        <div className="h-4 w-8 rounded bg-slate-200" />
      </div>
      <div className="flex justify-between">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="h-4 w-8 rounded bg-slate-200" />
      </div>
      <div className="flex justify-between">
        <div className="h-4 w-28 rounded bg-slate-200" />
        <div className="h-4 w-8 rounded bg-slate-200" />
      </div>
    </div>
  </article>
);

// ── Card de métrica interactiva ───────────────────────────────────────────────
// Patrón Stripe/Amplitude: cada card es clickeable y lleva al detalle.
// El hover revela una flecha → para indicar que es interactiva.
interface MetricCardProps {
  titulo: string;
  color: string;                              // clase Tailwind de color
  items: { label: string; valor: number | string; color: string }[];
  onClick?: () => void;
  hint?: string;                              // tooltip al hover
}

const MetricCard = ({ titulo, color, items, onClick, hint }: MetricCardProps) => (
  <article
    onClick={onClick}
    title={hint}
    className={`group relative p-6 ${onClick ? "cursor-pointer hover:bg-slate-50 transition-colors" : ""}`}
  >
    <div className="flex items-center justify-between mb-4">
      <h2 className={`text-lg font-semibold ${color}`}>{titulo}</h2>
      {onClick && (
        // Flecha que aparece al hover — indica interactividad sin ruido visual
        <ArrowRight className="h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </div>
    <div className="space-y-3 text-sm text-slate-700">
      {items.map(item => (
        <div key={item.label} className="flex items-center justify-between">
          <span className="text-slate-500">{item.label}</span>
          <span className={`font-semibold tabular-nums ${item.color}`}>
            {item.valor}
          </span>
        </div>
      ))}
    </div>
  </article>
);

// ── Componente principal ──────────────────────────────────────────────────────
export const DashboardView = () => {
  const navigate = useNavigate();
  const { idEmpresa } = useEmpresaActiva();

  // Datos reales del monitor — reutilizamos el endpoint que ya existe.
  // staleTime de 30s: el dashboard se refresca automáticamente mientras
  // el usuario lo tiene abierto, sin ser agresivo con el servidor.
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.monitor.unitsLive(idEmpresa, ""),
    queryFn: () => monitorService.getUnitsLive("", idEmpresa),
    enabled: !!idEmpresa,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,   // refresca cada minuto automáticamente
  });

  const counts = data?.counts;
  const total = counts?.total ?? 0;
  const operativas = counts?.engine_on ?? 0;
  const apagadas = counts?.engine_off ?? 0;
  const sinDatos = counts?.engine_unknown ?? 0;

  return (
    <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
      <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <Bus className="h-5 w-5 text-slate-500" />
            <div>
              <h1 className="text-xl font-semibold text-slate-800">
                Dashboard
              </h1>
              <p className="text-xs text-slate-400">Monitor de flota</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="capitalize">{fechaHoy()}</span>
            </div>
          </div>
        </div>

        {/* ── Métricas ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-b border-slate-200">

          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              {/* Unidades — dato real del monitor */}
              <MetricCard
                titulo="Unidades"
                color="text-blue-600"
                hint="Click para ver el mapa en tiempo real"
                onClick={() => navigate("/home/maps")}
                items={[
                  { label: "Total", valor: total, color: "text-sky-500" },
                  { label: "Encendidas", valor: operativas, color: "text-emerald-500" },
                  { label: "Apagadas", valor: apagadas, color: "text-rose-500" },
                  { label: "Sin señal", valor: sinDatos, color: "text-slate-400" },
                ]}
              />

              {/* Kilómetros — placeholder hasta conectar endpoint de recorridos */}
              <MetricCard
                titulo="Kilómetros"
                color="text-slate-700"
                hint="Ver reporte de kilómetros recorridos"
                onClick={() => navigate("/home/reports")}
                items={[
                  { label: "Recorridos", valor: "—", color: "text-sky-500" },
                  { label: "Unidades con km", valor: "—", color: "text-emerald-500" },
                  { label: "Unidades sin km", valor: "—", color: "text-slate-400" },
                ]}
              />

              {/* Minutos de utilización — placeholder */}
              <MetricCard
                titulo="Minutos de uso"
                color="text-emerald-600"
                onClick={() => navigate("/home/reports")}
                items={[
                  { label: "En movimiento", valor: "—", color: "text-emerald-500" },
                  { label: "En ralentí", valor: "—", color: "text-sky-500" },
                  { label: "Inactividad", valor: "—", color: "text-slate-400" },
                ]}
              />

              {/* Excesos de velocidad — placeholder */}
              <MetricCard
                titulo="Excesos velocidad"
                color="text-rose-500"
                onClick={() => navigate("/home/reports")}
                items={[
                  { label: "Eventos", valor: "—", color: "text-rose-500" },
                  { label: "Minutos", valor: "—", color: "text-orange-500" },
                  { label: "Unidades", valor: "—", color: "text-slate-500" },
                ]}
              />
            </>
          )}
        </div>

        {/* ── Accesos rápidos ───────────────────────────────────────── */}
        {/* Patrón Notion: empty state útil. En lugar de decir "no hay datos"
                    mostramos CTAs que llevan al usuario a generar esos datos. */}
        <div className="flex-1 p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Accesos rápidos
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickAccessCard
              icon={<MapPin className="h-5 w-5 text-sky-500" />}
              titulo="Ver mapa en vivo"
              descripcion={`${operativas} unidad${operativas !== 1 ? "es" : ""} encendida${operativas !== 1 ? "s" : ""} ahora mismo`}
              onClick={() => navigate("/home/maps")}
              badge={operativas > 0 ? String(operativas) : undefined}
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

// ── Card de acceso rápido ─────────────────────────────────────────────────────
// Patrón Stripe Dashboard: cada card es una puerta de entrada a más detalle.
// Contexto real en la descripción — no texto genérico.
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
    className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-150"
  >
    <div className="relative shrink-0">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-white transition-colors">
        {icon}
      </div>
      {badge && (
        <span className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${badgeColor}`}>
          {badge}
        </span>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">
        {titulo}
      </p>
      <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
        {descripcion}
      </p>
    </div>
    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
  </button>
);