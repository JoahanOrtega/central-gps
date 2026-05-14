// features/reports/geocercas/EventosGeocercaView.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Vista del historial de eventos de geocerca.
//
// UX decisions:
//   Nielsen #1 (visibilidad) — badge de color por tipo de evento comunica
//     el tipo sin necesidad de leer el texto completo.
//   Nielsen #3 (control) — presets de fecha (Hoy, Ayer, 7 días, 30 días)
//     reducen clics para los casos más comunes.
//   Nielsen #6 (reconocimiento) — dropdowns con nombres reales de unidades
//     y POIs en lugar de IDs numéricos.
//   Nielsen #7 (flexibilidad) — todos los filtros son opcionales.
//   Nielsen #8 (eficiencia) — "Filtrar" solo re-fetcha cuando el usuario
//     lo decide, no en cada keystroke.
//   Hick's Law — tipos de evento como lista vertical con color: el usuario
//     identifica visualmente sin necesidad de leer.
//   Fitts — panel lateral con áreas de click generosas.

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Bell,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    FileText,
    AlertCircle,
    Loader2,
    RotateCcw,
    SlidersHorizontal,
} from "lucide-react";

import { eventosService } from "./eventosService";
import { poiService } from "@/features/catalogs/pois/poiService";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { queryKeys } from "@/lib/query-keys";
import { TableSkeleton } from "@/components/shared/SkeletonCard";
import type { EventosFiltros, TipoEventoGeocerca } from "./eventos.types";
import { TIPOS_EVENTO_CONFIG, GRUPOS_EVENTO } from "./eventos.types";
import {
    formatAppDateTimeShort,
    APP_TIMEZONE,
} from "@/lib/date-time";

// ── Helpers de fecha ──────────────────────────────────────────────────────────

/**
 * Convierte un Date a "YYYY-MM-DDTHH:MM" en UTC-6.
 * El input[type=datetime-local] muestra hora local — sin esto mostraría
 * la hora en UTC (+6 horas de diferencia para el usuario).
 */
const toDateInputValue = (date: Date): string => {
    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: APP_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
    return fmt.format(date).replace(", ", "T");
};

/**
 * Convierte el valor de un input datetime-local (hora local UTC-6) a ISO UTC.
 * El backend filtra en UTC — hay que especificar el offset antes de parsear.
 */
const localInputToIso = (localValue: string): string => {
    if (!localValue) return "";
    const withOffset = `${localValue}:00-06:00`;
    const date = new Date(withOffset);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

// ── Presets de período ────────────────────────────────────────────────────────
type PresetId = "hoy" | "ayer" | "7d" | "30d" | "personalizado";

interface Preset {
    id: PresetId;
    label: string;
    desde: () => Date;
    hasta: () => Date;
}

const PRESETS: Preset[] = [
    {
        id: "hoy",
        label: "Hoy",
        desde: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; },
        hasta: () => new Date(),
    },
    {
        id: "ayer",
        label: "Ayer",
        desde: () => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d; },
        hasta: () => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(23, 59, 59, 0); return d; },
    },
    {
        id: "7d",
        label: "7 días",
        desde: () => { const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d; },
        hasta: () => new Date(),
    },
    {
        id: "30d",
        label: "30 días",
        desde: () => { const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0); return d; },
        hasta: () => new Date(),
    },
];

// ── Estado del formulario de filtros ─────────────────────────────────────────
interface FiltrosForm {
    preset: PresetId;
    desde: string;
    hasta: string;
    id_unidad: string;
    id_poi: string;
    tipos: number[];
}

const buildDefaultForm = (): FiltrosForm => {
    const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0);
    return {
        preset: "7d",
        desde: toDateInputValue(d),
        hasta: toDateInputValue(new Date()),
        id_unidad: "",
        id_poi: "",
        tipos: [],
    };
};

const formToFiltros = (form: FiltrosForm): EventosFiltros => {
    const f: EventosFiltros = { limite: 50 };
    if (form.desde) f.desde = localInputToIso(form.desde);
    if (form.hasta) f.hasta = localInputToIso(form.hasta);
    if (form.id_unidad) f.id_unidad = Number(form.id_unidad);
    if (form.id_poi) f.id_poi = Number(form.id_poi);
    if (form.tipos.length) f.tipos_evento = form.tipos;
    return f;
};

// ── Componente principal ──────────────────────────────────────────────────────
export const EventosGeocercaView = () => {
    const { idEmpresa } = useEmpresaActiva();

    const [form, setForm] = useState<FiltrosForm>(buildDefaultForm);
    const [filtrosAplicados, setFiltrosAplicados] = useState<EventosFiltros>(() => formToFiltros(buildDefaultForm()));
    const [paginaActual, setPaginaActual] = useState(1);

    // ── Query: unidades ───────────────────────────────────────────────────────
    const { data: unidadesRaw = [] } = useQuery<{ id: number; numero: string; marca: string }[]>({
        queryKey: ["unidades-lista", idEmpresa],
        queryFn: async () => {
            const { apiFetch } = await import("@/lib/api");
            return apiFetch(`/units?id_empresa=${idEmpresa}`, { method: "GET" });
        },
        enabled: !!idEmpresa,
        staleTime: 5 * 60 * 1000,
    });

    // ── Query: POIs ───────────────────────────────────────────────────────────
    const { data: pois = [] } = useQuery({
        queryKey: queryKeys.pois.list(idEmpresa, ""),
        queryFn: () => poiService.getPois("", idEmpresa),
        enabled: !!idEmpresa,
        staleTime: 5 * 60 * 1000,
    });

    // ── Query: eventos ────────────────────────────────────────────────────────
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.eventos.lista(idEmpresa, filtrosAplicados, paginaActual),
        queryFn: () => eventosService.getEventos(
            { ...filtrosAplicados, pagina: paginaActual },
            idEmpresa,
        ),
        enabled: !!idEmpresa,
    });

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handlePreset = (presetId: PresetId) => {
        const preset = PRESETS.find(p => p.id === presetId);
        if (!preset) { setForm(p => ({ ...p, preset: presetId })); return; }
        setForm(p => ({
            ...p,
            preset: presetId,
            desde: toDateInputValue(preset.desde()),
            hasta: toDateInputValue(preset.hasta()),
        }));
    };

    const handleFiltrar = useCallback(() => {
        setFiltrosAplicados(formToFiltros(form));
        setPaginaActual(1);
    }, [form]);

    const handleLimpiar = () => {
        const def = buildDefaultForm();
        setForm(def);
        setFiltrosAplicados(formToFiltros(def));
        setPaginaActual(1);
    };

    const handleToggleTipo = (tipo: number) => {
        setForm(p => ({
            ...p,
            tipos: p.tipos.includes(tipo)
                ? p.tipos.filter(t => t !== tipo)
                : [...p.tipos, tipo],
        }));
    };

    const handleExportar = () => {
        const url = eventosService.getExportUrl(
            filtrosAplicados,
            idEmpresa,
            import.meta.env.VITE_API_URL || "",
        );
        window.open(url, "_blank");
    };

    // ── Datos derivados ───────────────────────────────────────────────────────
    const eventos = data?.eventos ?? [];
    const totalPaginas = data?.total_paginas ?? 1;
    const total = data?.total ?? 0;
    const errorMessage = error instanceof Error ? error.message : null;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
            <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">

                {/* ── Header ───────────────────────────────────────────────── */}
                <div className="border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Bell className="h-5 w-5 text-slate-500" />
                            <h1 className="text-xl font-semibold text-slate-800">
                                Eventos de Geocerca
                            </h1>
                            {total > 0 && (
                                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                    {total.toLocaleString("es-MX")} eventos
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleExportar}
                            disabled={eventos.length === 0}
                            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                            <Download className="h-4 w-4" />
                            Exportar CSV
                        </button>
                    </div>
                </div>

                {/* ── Layout principal: panel lateral + tabla ───────────────── */}
                <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">

                    {/* ── Panel de filtros lateral ─────────────────────────── */}
                    <aside className="w-full shrink-0 overflow-y-auto border-b border-slate-200 bg-slate-50 p-4 lg:w-64 lg:border-b-0 lg:border-r lg:p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-semibold text-slate-700">Filtros</span>
                        </div>

                        <div className="space-y-5">

                            {/* ── Período ──────────────────────────────────── */}
                            <div>
                                <label className="mb-2 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Período
                                </label>
                                {/* Pills de preset — Nielsen #3: accesos rápidos a
                                    los casos más comunes sin escribir fechas */}
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {PRESETS.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handlePreset(p.id)}
                                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${form.preset === p.id
                                                ? "bg-blue-600 text-white"
                                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                                                }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <label className="mb-1 block text-xs text-slate-500">Inicio</label>
                                        <input
                                            type="datetime-local"
                                            value={form.desde}
                                            onChange={e => setForm(p => ({
                                                ...p,
                                                desde: e.target.value,
                                                preset: "personalizado",
                                            }))}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs text-slate-500">Fin</label>
                                        <input
                                            type="datetime-local"
                                            value={form.hasta}
                                            onChange={e => setForm(p => ({
                                                ...p,
                                                hasta: e.target.value,
                                                preset: "personalizado",
                                            }))}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Unidad ───────────────────────────────────── */}
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Unidad
                                </label>
                                <div className="relative">
                                    <select
                                        value={form.id_unidad}
                                        onChange={e => setForm(p => ({ ...p, id_unidad: e.target.value }))}
                                        className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 outline-none focus:border-blue-400"
                                    >
                                        <option value="">— Todas —</option>
                                        {unidadesRaw.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.numero}{u.marca ? ` · ${u.marca}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>

                            {/* ── Punto de Interés ─────────────────────────── */}
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Punto de Interés
                                </label>
                                <div className="relative">
                                    <select
                                        value={form.id_poi}
                                        onChange={e => setForm(p => ({ ...p, id_poi: e.target.value }))}
                                        className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 outline-none focus:border-blue-400"
                                    >
                                        <option value="">— Todos —</option>
                                        {pois.map(p => (
                                            <option key={p.id_poi} value={p.id_poi}>
                                                {p.nombre}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>

                            {/* ── Tipo de evento ───────────────────────────── */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Tipo de evento
                                    </label>
                                    {form.tipos.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setForm(p => ({ ...p, tipos: [] }))}
                                            className="text-xs text-slate-400 hover:text-slate-600"
                                        >
                                            Limpiar
                                        </button>
                                    )}
                                </div>
                                {/* Lista agrupada — Hick's Law: separar geocerca
                                    de velocidad global reduce la carga cognitiva */}
                                <div className="space-y-3">
                                    {(Object.entries(GRUPOS_EVENTO) as [keyof typeof GRUPOS_EVENTO, string][]).map(
                                        ([grupo, labelGrupo]) => {
                                            const tiposGrupo = (
                                                Object.entries(TIPOS_EVENTO_CONFIG) as [
                                                    string,
                                                    typeof TIPOS_EVENTO_CONFIG[TipoEventoGeocerca],
                                                ][]
                                            ).filter(([, cfg]) => cfg.grupo === grupo);

                                            return (
                                                <div key={grupo}>
                                                    <p className="mb-1 px-1 text-xs font-medium text-slate-400 uppercase tracking-wide">
                                                        {labelGrupo}
                                                    </p>
                                                    <div className="space-y-1">
                                                        {tiposGrupo.map(([tipo, config]) => {
                                                            const t = Number(tipo);
                                                            const activo = form.tipos.includes(t);
                                                            return (
                                                                <button
                                                                    key={tipo}
                                                                    type="button"
                                                                    onClick={() => handleToggleTipo(t)}
                                                                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-left transition-colors ${activo
                                                                            ? `${config.bg} ${config.color} font-medium`
                                                                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                                                        }`}
                                                                >
                                                                    <span className={`h-2 w-2 shrink-0 rounded-full ${activo ? config.dot : "bg-slate-300"}`} />
                                                                    <span className="flex-1">{config.label}</span>
                                                                    {activo && <span className="ml-auto opacity-60">✓</span>}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }
                                    )}
                                </div>
                            </div>

                            {/* ── Botones ──────────────────────────────────── */}
                            <div className="space-y-2 pt-1 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={handleFiltrar}
                                    className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                                >
                                    Filtrar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleLimpiar}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Limpiar
                                </button>
                            </div>

                        </div>
                    </aside>

                    {/* ── Área de resultados ───────────────────────────────── */}
                    <div className="flex-1 overflow-auto p-4 md:p-6">

                        {/* Skeleton */}
                        {isLoading && (
                            <TableSkeleton
                                headers={["Fecha / Hora", "Unidad", "POI", "Evento", "Detalle"]}
                                cols={5}
                                rows={8}
                            />
                        )}

                        {/* Error */}
                        {errorMessage && !isLoading && (
                            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <span>{errorMessage}</span>
                                <button
                                    type="button"
                                    onClick={() => refetch()}
                                    className="ml-auto rounded-lg border border-red-300 px-3 py-1 text-xs hover:bg-red-100"
                                >
                                    Reintentar
                                </button>
                            </div>
                        )}

                        {/* Estado vacío */}
                        {!isLoading && !errorMessage && eventos.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                                    <FileText className="h-8 w-8 text-slate-400" />
                                </div>
                                <p className="text-sm font-semibold text-slate-600">
                                    Sin eventos en el período seleccionado
                                </p>
                                <p className="mt-1 max-w-xs text-xs text-slate-400">
                                    Ajusta los filtros y vuelve a filtrar
                                </p>
                            </div>
                        )}

                        {/* Tabla */}
                        {!isLoading && !errorMessage && eventos.length > 0 && (
                            <>
                                <p className="mb-3 text-xs text-slate-500">
                                    Mostrando{" "}
                                    <span className="font-medium text-slate-700">{eventos.length}</span>
                                    {" "}de{" "}
                                    <span className="font-medium text-slate-700">{total.toLocaleString("es-MX")}</span>
                                    {" "}eventos
                                </p>

                                {/* Desktop */}
                                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                                                <th className="px-4 py-3">Fecha / Hora</th>
                                                <th className="px-4 py-3">Unidad</th>
                                                <th className="px-4 py-3">POI</th>
                                                <th className="px-4 py-3">Evento</th>
                                                <th className="px-4 py-3">Detalle</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {eventos.map(ev => (
                                                <EventoRow key={ev.id_evento} evento={ev} />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile */}
                                <div className="space-y-3 md:hidden">
                                    {eventos.map(ev => (
                                        <EventoCard key={ev.id_evento} evento={ev} />
                                    ))}
                                </div>

                                {/* Paginación */}
                                {totalPaginas > 1 && (
                                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                                        <span className="text-xs text-slate-500">
                                            Página {paginaActual} de {totalPaginas}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                                                disabled={paginaActual === 1}
                                                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                                                disabled={paginaActual === totalPaginas}
                                                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

            </section>
        </main>
    );
};

// ── Sub-componentes ───────────────────────────────────────────────────────────

import type { EventoGeocerca } from "./eventos.types";

const EventoRow = ({ evento }: { evento: EventoGeocerca }) => {
    const config = TIPOS_EVENTO_CONFIG[evento.tipo_evento] ?? {
        label: evento.descripcion,
        color: "text-slate-600",
        bg: "bg-slate-100",
        dot: "bg-slate-400",
    };

    const payload = evento.payload
        ? (() => { try { return JSON.parse(evento.payload); } catch { return null; } })()
        : null;

    return (
        <tr className="hover:bg-slate-50 transition-colors">
            <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                {formatAppDateTimeShort(evento.fecha_hora_gmt)}
            </td>
            <td className="px-4 py-3">
                <span className="font-medium text-slate-800">{evento.numero_unidad}</span>
                {evento.marca_unidad && (
                    <span className="ml-1 text-xs text-slate-400">{evento.marca_unidad}</span>
                )}
            </td>
            <td className="px-4 py-3 text-sm text-slate-600">
                {evento.nombre_poi ?? <span className="text-slate-400 italic">Sin POI</span>}
            </td>
            <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                    {config.label}
                </span>
            </td>
            <td className="px-4 py-3 text-xs text-slate-500">
                {payload ? <DetallePayload payload={payload} tipo={evento.tipo_evento} /> : "—"}
            </td>
        </tr>
    );
};

const EventoCard = ({ evento }: { evento: EventoGeocerca }) => {
    const config = TIPOS_EVENTO_CONFIG[evento.tipo_evento] ?? {
        label: evento.descripcion,
        color: "text-slate-600",
        bg: "bg-slate-100",
        dot: "bg-slate-400",
    };

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
                <span className="text-xs text-slate-500">
                    {formatAppDateTimeShort(evento.fecha_hora_gmt)}
                </span>
                <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                    {config.label}
                </span>
            </div>
            <p className="font-medium text-slate-800">
                {evento.numero_unidad}
                {evento.marca_unidad && (
                    <span className="ml-1 text-xs font-normal text-slate-400">{evento.marca_unidad}</span>
                )}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
                {evento.nombre_poi ?? <span className="italic">Sin POI</span>}
            </p>
        </article>
    );
};

const DetallePayload = ({
    payload,
    tipo,
}: {
    payload: Record<string, unknown>;
    tipo: TipoEventoGeocerca;
}) => {
    // ── Velocidad global (ev. 3/4) ────────────────────────────────────────────
    if (tipo === 3) {
        return (
            <span>
                {payload.velocidad_actual as number} km/h{" · "}
                máx permitida {payload.vel_max as number} km/h
            </span>
        );
    }
    if (tipo === 4) {
        return (
            <span>
                máx {payload.vel_max_alcanzada as number} km/h{" · "}
                {payload.duracion_segundos as number}s
                {payload.distancia_km ? ` · ${payload.distancia_km as number} km` : ""}
            </span>
        );
    }

    // ── Permanencia (ev. 12/13) ───────────────────────────────────────────────
    if (tipo === 12 || tipo === 13) {
        return (
            <span>
                {payload.minutos_dentro as number} min dentro{" / "}
                {tipo === 12 ? "máx" : "mín"}{" "}
                {String(payload.minutos_permitidos ?? payload.minutos_requeridos)} min
            </span>
        );
    }

    // ── Velocidad en POI fin (ev. 15) ─────────────────────────────────────────
    if (tipo === 15) {
        return (
            <span>
                máx {payload.vel_max_alcanzada as number} km/h{" · "}
                {payload.duracion_segundos as number}s
            </span>
        );
    }

    // ev. 10, 11, 14, 19 — sin payload relevante que mostrar
    return null;
};