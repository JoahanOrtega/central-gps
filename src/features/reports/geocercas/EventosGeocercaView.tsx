// features/reports/geocercas/EventosGeocercaView.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Vista del historial de eventos de geocerca con filtros y paginacion.
//
// UX decisions:
//   Nielsen #1 (visibilidad) — badge de color por tipo de evento comunica
//     el tipo sin necesidad de leer el texto completo.
//   Nielsen #4 (consistencia) — mismo patron de filtros que AuditoriaPage.
//   Nielsen #6 (reconocimiento) — filtros con labels claros y placeholders
//     con ejemplos concretos de formato.
//   Nielsen #7 (flexibilidad) — filtros opcionales: el usuario puede ver
//     todos los eventos sin configurar nada.
//   Hick's Law — el selector de tipo de evento muestra opciones claras con
//     color para reducir tiempo de decision.

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    FileText,
    Filter,
    Download,
    ChevronLeft,
    ChevronRight,
    MapPin,
    AlertCircle,
    Loader2,
} from "lucide-react";

import { eventosService } from "./eventosService";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { queryKeys } from "@/lib/query-keys";
import type { EventosFiltros, TipoEventoGeocerca } from "./eventos.types";
import { TIPOS_EVENTO_CONFIG } from "./eventos.types";
import {
    parseApiDate,
    formatAppDateTimeShort,
    APP_TIMEZONE,
} from "@/lib/date-time";

// ── Defaults de filtros ───────────────────────────────────────────────────────
// Por defecto muestra los ultimos 7 dias.
// Los inputs datetime-local muestran hora LOCAL (UTC-6) — usamos
// Intl.DateTimeFormat con APP_TIMEZONE para obtener el valor correcto
// en lugar de .toISOString() que devuelve UTC y mostraria +6 horas de diferencia.
const ahora = new Date();
const hace7dias = new Date(ahora);
hace7dias.setDate(ahora.getDate() - 7);

/**
 * Convierte un Date a "YYYY-MM-DDTHH:MM" en zona horaria UTC-6.
 * El input[type=datetime-local] espera este formato en hora LOCAL —
 * .toISOString() devuelve UTC y mostraria la hora incorrecta al usuario.
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
    // en-CA produce "YYYY-MM-DD, HH:MM" — convertir a "YYYY-MM-DDTHH:MM"
    return fmt.format(date).replace(", ", "T");
};

/**
 * Convierte el valor de un input datetime-local (hora local UTC-6) a ISO UTC.
 * El backend espera UTC — hay que sumar 6 horas al valor que ingresa el usuario.
 */
const localInputToIso = (localValue: string): string => {
    if (!localValue) return "";
    // El valor del input esta en UTC-6. Construimos la fecha asumiendo UTC-6
    // usando el truco de agregar el offset explicitamente antes de parsear.
    const withOffset = `${localValue}:00-06:00`;
    const date = new Date(withOffset);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const FILTROS_DEFAULT: EventosFiltros = {
    desde: localInputToIso(toDateInputValue(hace7dias)),
    hasta: localInputToIso(toDateInputValue(ahora)),
    pagina: 1,
    limite: 50,
};

// ── Componente principal ──────────────────────────────────────────────────────
export const EventosGeocercaView = () => {
    const { idEmpresa } = useEmpresaActiva();

    // Estado de filtros — separado del estado de query para aplicarlos
    // solo al hacer click en "Aplicar" (evita re-fetches en cada keystroke)
    const [filtrosForm, setFiltrosForm] = useState({
        desde: toDateInputValue(hace7dias),
        hasta: toDateInputValue(ahora),
        id_unidad: "",
        id_poi: "",
        tipos: [] as number[],
    });
    const [filtrosAplicados, setFiltrosAplicados] = useState<EventosFiltros>(FILTROS_DEFAULT);
    const [paginaActual, setPaginaActual] = useState(1);

    // ── Query ─────────────────────────────────────────────────────────────────
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: queryKeys.eventos.lista(idEmpresa, filtrosAplicados, paginaActual),
        queryFn: () => eventosService.getEventos(
            { ...filtrosAplicados, pagina: paginaActual },
            idEmpresa,
        ),
        enabled: !!idEmpresa,
    });

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleAplicarFiltros = useCallback(() => {
        const nuevos: EventosFiltros = {
            limite: 50,
        };
        // localInputToIso convierte el valor UTC-6 del input a ISO UTC
        // para que el backend filtre correctamente en la zona correcta
        if (filtrosForm.desde)
            nuevos.desde = localInputToIso(filtrosForm.desde);
        if (filtrosForm.hasta)
            nuevos.hasta = localInputToIso(filtrosForm.hasta);
        if (filtrosForm.id_unidad)
            nuevos.id_unidad = Number(filtrosForm.id_unidad);
        if (filtrosForm.id_poi)
            nuevos.id_poi = Number(filtrosForm.id_poi);
        if (filtrosForm.tipos.length)
            nuevos.tipos_evento = filtrosForm.tipos;

        setFiltrosAplicados(nuevos);
        setPaginaActual(1);
    }, [filtrosForm]);

    const handleLimpiarFiltros = () => {
        setFiltrosForm({
            desde: toDateInputValue(hace7dias),
            hasta: toDateInputValue(ahora),
            id_unidad: "",
            id_poi: "",
            tipos: [],
        });
        setFiltrosAplicados({
            ...FILTROS_DEFAULT,
            desde: localInputToIso(toDateInputValue(hace7dias)),
            hasta: localInputToIso(toDateInputValue(ahora)),
        });
        setPaginaActual(1);
    };

    const handleToggleTipo = (tipo: number) => {
        setFiltrosForm((prev) => ({
            ...prev,
            tipos: prev.tipos.includes(tipo)
                ? prev.tipos.filter((t) => t !== tipo)
                : [...prev.tipos, tipo],
        }));
    };

    const handleExportar = () => {
        const apiBase = import.meta.env.VITE_API_URL || "";
        // Agregar token al header via URL — el endpoint acepta Bearer en header
        // pero para descarga directa del navegador usamos el endpoint con token
        const url = eventosService.getExportUrl(filtrosAplicados, idEmpresa, apiBase);
        window.open(url, "_blank");
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const eventos = data?.eventos ?? [];
    const totalPaginas = data?.total_paginas ?? 1;
    const total = data?.total ?? 0;
    const errorMessage = error instanceof Error ? error.message : null;

    return (
        <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
            <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">

                {/* ── Header ───────────────────────────────────────────────── */}
                <div className="border-b border-slate-200 px-4 py-4 md:px-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-slate-500" />
                            <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">
                                Eventos de Geocerca
                            </h1>
                            {total > 0 && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                    {total} eventos
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

                {/* ── Panel de filtros ─────────────────────────────────────── */}
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-4 md:px-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-600">Filtros</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Fecha desde */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                                Desde
                            </label>
                            <input
                                type="datetime-local"
                                value={filtrosForm.desde}
                                onChange={(e) =>
                                    setFiltrosForm((p) => ({ ...p, desde: e.target.value }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                        </div>

                        {/* Fecha hasta */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                                Hasta
                            </label>
                            <input
                                type="datetime-local"
                                value={filtrosForm.hasta}
                                onChange={(e) =>
                                    setFiltrosForm((p) => ({ ...p, hasta: e.target.value }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                        </div>

                        {/* ID Unidad */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                                ID Unidad
                            </label>
                            <input
                                type="number"
                                placeholder="Ej. 1261"
                                value={filtrosForm.id_unidad}
                                onChange={(e) =>
                                    setFiltrosForm((p) => ({ ...p, id_unidad: e.target.value }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                        </div>

                        {/* ID POI */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                                ID POI
                            </label>
                            <input
                                type="number"
                                placeholder="Ej. 1"
                                value={filtrosForm.id_poi}
                                onChange={(e) =>
                                    setFiltrosForm((p) => ({ ...p, id_poi: e.target.value }))
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                        </div>
                    </div>

                    {/* Filtro de tipos de evento */}
                    <div className="mt-3">
                        <label className="mb-2 block text-xs font-medium text-slate-500">
                            Tipo de evento
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {(Object.entries(TIPOS_EVENTO_CONFIG) as [string, typeof TIPOS_EVENTO_CONFIG[TipoEventoGeocerca]][]).map(
                                ([tipo, config]) => {
                                    const t = Number(tipo);
                                    const activo = filtrosForm.tipos.includes(t);
                                    return (
                                        <button
                                            key={tipo}
                                            type="button"
                                            onClick={() => handleToggleTipo(t)}
                                            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${activo
                                                ? `${config.bg} ${config.color} ring-1 ring-current`
                                                : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                                                }`}
                                        >
                                            <span className={`h-2 w-2 rounded-full ${activo ? config.dot : "bg-slate-300"}`} />
                                            {config.label}
                                        </button>
                                    );
                                }
                            )}
                        </div>
                    </div>

                    {/* Botones de filtro */}
                    <div className="mt-3 flex gap-2">
                        <button
                            type="button"
                            onClick={handleAplicarFiltros}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Aplicar filtros
                        </button>
                        <button
                            type="button"
                            onClick={handleLimpiarFiltros}
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                            Limpiar
                        </button>
                    </div>
                </div>

                {/* ── Contenido ────────────────────────────────────────────── */}
                <div className="flex-1 p-4 md:p-6">

                    {/* Estado de carga */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    )}

                    {/* Estado de error */}
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

                    {/* Estado vacio */}
                    {!isLoading && !errorMessage && eventos.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <FileText className="mb-3 h-10 w-10 text-slate-300" />
                            <p className="text-sm font-medium text-slate-500">
                                Sin eventos en el rango seleccionado
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                Ajusta los filtros de fecha o tipo de evento
                            </p>
                        </div>
                    )}

                    {/* Tabla de eventos */}
                    {!isLoading && !errorMessage && eventos.length > 0 && (
                        <>
                            {/* Vista desktop — tabla */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                                            <th className="pb-3 pr-4">Fecha / Hora</th>
                                            <th className="pb-3 pr-4">Unidad</th>
                                            <th className="pb-3 pr-4">POI</th>
                                            <th className="pb-3 pr-4">Evento</th>
                                            <th className="pb-3">Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {eventos.map((ev) => (
                                            <EventoRow key={ev.id_evento} evento={ev} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Vista mobile — cards */}
                            <div className="space-y-3 md:hidden">
                                {eventos.map((ev) => (
                                    <EventoCard key={ev.id_evento} evento={ev} />
                                ))}
                            </div>

                            {/* Paginacion */}
                            {totalPaginas > 1 && (
                                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                                    <span className="text-xs text-slate-500">
                                        Pagina {paginaActual} de {totalPaginas}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                                            disabled={paginaActual === 1}
                                            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
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
            </section>
        </main>
    );
};

// ── Sub-componentes ───────────────────────────────────────────────────────────

import type { EventoGeocerca } from "./eventos.types";

// Fila de tabla para desktop
const EventoRow = ({ evento }: { evento: EventoGeocerca }) => {
    const config = TIPOS_EVENTO_CONFIG[evento.tipo_evento] ?? {
        label: evento.descripcion,
        color: "text-slate-600",
        bg: "bg-slate-100",
        dot: "bg-slate-400",
    };

    const payload = evento.payload ? (() => {
        try { return JSON.parse(evento.payload); }
        catch { return null; }
    })() : null;

    return (
        <tr className="hover:bg-slate-50">
            <td className="py-3 pr-4 text-xs text-slate-500 whitespace-nowrap">
                {/* formatAppDateTimeShort convierte de UTC a UTC-6 (America/Mexico_City) */}
                {formatAppDateTimeShort(evento.fecha_hora_gmt)}
            </td>
            <td className="py-3 pr-4">
                <span className="font-medium text-slate-800">{evento.numero_unidad}</span>
                {evento.marca_unidad && (
                    <span className="ml-1 text-xs text-slate-400">{evento.marca_unidad}</span>
                )}
            </td>
            <td className="py-3 pr-4 text-slate-600">{evento.nombre_poi}</td>
            <td className="py-3 pr-4">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                    {config.label}
                </span>
            </td>
            <td className="py-3 text-xs text-slate-500">
                {payload ? <DetallePayload payload={payload} tipo={evento.tipo_evento} /> : "—"}
            </td>
        </tr>
    );
};

// Card para mobile
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
                    {/* formatAppDateTimeShort convierte de UTC a UTC-6 */}
                    {formatAppDateTimeShort(evento.fecha_hora_gmt)}
                </span>
                <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                    {config.label}
                </span>
            </div>
            <p className="font-medium text-slate-800">{evento.numero_unidad}
                {evento.marca_unidad && (
                    <span className="ml-1 text-xs font-normal text-slate-400">{evento.marca_unidad}</span>
                )}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{evento.nombre_poi}</p>
        </article>
    );
};

// Detalle del payload por tipo de evento
const DetallePayload = ({
    payload,
    tipo,
}: {
    payload: Record<string, unknown>;
    tipo: TipoEventoGeocerca;
}) => {
    if (tipo === 12 || tipo === 13) {
        return (
            <span>
                {payload.minutos_dentro as number} min dentro
                {" / "}
                {tipo === 12 ? "max" : "min"} {(payload.minutos_permitidos ?? payload.minutos_requeridos) as number} min
            </span>
        );
    }
    if (tipo === 15) {
        return (
            <span>
                max {payload.vel_max_alcanzada as number} km/h
                {" · "}
                {payload.duracion_segundos as number}s
            </span>
        );
    }
    return null;
};