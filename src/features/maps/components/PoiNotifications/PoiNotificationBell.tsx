/**
 * features/maps/components/PoiNotifications/PoiNotificationBell.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Campana de notificaciones de eventos POI para el navbar.
 *
 * Heurísticas UX aplicadas:
 *   - Nielsen #1 (Visibilidad del estado): badge rojo con conteo informa
 *     de eventos pendientes sin interrumpir el flujo del usuario.
 *   - Nielsen #3 (Control del usuario): el usuario decide cuándo abrir
 *     el panel — no se fuerza ninguna interrupción modal.
 *   - Nielsen #4 (Consistencia): sigue el patrón de campana de
 *     notificaciones de Slack, Gmail y otras apps conocidas (Ley de Jakob).
 *   - Fitts's Law: el botón tiene tamaño táctil adecuado (min 44px).
 *   - Hick's Law: el panel muestra máximo 50 eventos — no abruma.
 */

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, CheckCheck, MapPin, X } from "lucide-react";
import { usePoiEventsStore } from "@/stores/poiEventsStore";
import type { PoiEvent, TipoEventoPoi } from "@/stores/poiEventsStore";
import { cn } from "@/lib/utils";
import { parseApiDate, APP_TIMEZONE } from "@/lib/date-time";

// ── Helpers de presentación ───────────────────────────────────────────────────

/** Texto y color por tipo de evento — para que el usuario entienda de un vistazo. */
const CONFIG_EVENTO: Record<
    TipoEventoPoi,
    { label: string; color: string; dot: string }
> = {
    10: { label: "Entró al POI", color: "text-emerald-700", dot: "bg-emerald-500" },
    11: { label: "Salió del POI", color: "text-slate-600", dot: "bg-slate-400" },
    12: { label: "Permanencia excedida", color: "text-amber-700", dot: "bg-amber-500" },
    13: { label: "Permanencia insuficiente", color: "text-orange-700", dot: "bg-orange-500" },
    14: { label: "Exceso de velocidad", color: "text-red-700", dot: "bg-red-500" },
    15: { label: "Velocidad normalizada", color: "text-blue-700", dot: "bg-blue-400" },
};

/**
 * Formatea la hora del evento en UTC-6 (America/Mexico_City).
 * Los eventos llegan con fecha_hora_evento en UTC desde el backend —
 * sin especificar timeZone, el navegador usa la zona local del SO del
 * usuario, que puede no ser UTC-6.
 */
function formatHora(iso: string): string {
    const date = parseApiDate(iso);
    if (!date) return iso;
    return new Intl.DateTimeFormat("es-MX", {
        timeZone: APP_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(date);
}

// ── Sub-componente: fila de evento ────────────────────────────────────────────

interface EventoItemProps {
    evento: PoiEvent;
}

const EventoItem = ({ evento }: EventoItemProps) => {
    const cfg = CONFIG_EVENTO[evento.tipo_evento] ?? {
        label: "Evento",
        color: "text-slate-600",
        dot: "bg-slate-400",
    };

    return (
        <li
            className={cn(
                "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                evento.leido ? "bg-white" : "bg-emerald-50/60",
            )}
        >
            {/* Dot de color por tipo */}
            <span
                className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", cfg.dot)}
                aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
                {/* Unidad y POI */}
                <p className="truncate text-sm font-semibold text-slate-800">
                    {evento.numero_unidad}
                </p>
                <p className={cn("text-xs font-medium", cfg.color)}>
                    {cfg.label}
                </p>
                <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {evento.nombre_poi}
                </p>
            </div>

            {/* Hora */}
            <time
                className="shrink-0 text-xs text-slate-400"
                dateTime={evento.fecha_hora_evento}
            >
                {formatHora(evento.fecha_hora_evento)}
            </time>
        </li>
    );
};

// ── Componente principal ──────────────────────────────────────────────────────

export const PoiNotificationBell = () => {
    const eventos = usePoiEventsStore((s) => s.eventos);
    const noLeidos = usePoiEventsStore((s) => s.noLeidos);
    const conectado = usePoiEventsStore((s) => s.conectado);
    const marcarTodosLeidos = usePoiEventsStore((s) => s.marcarTodosLeidos);
    const limpiarEventos = usePoiEventsStore((s) => s.limpiarEventos);

    const [abierto, setAbierto] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // ── Cerrar panel al hacer click fuera (Nielsen #3: control del usuario) ──────
    useEffect(() => {
        if (!abierto) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setAbierto(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [abierto]);

    // ── Al abrir el panel, marcar todos como leídos ───────────────────────────────
    const handleToggle = () => {
        if (!abierto && noLeidos > 0) {
            marcarTodosLeidos();
        }
        setAbierto((prev) => !prev);
    };

    return (
        <div ref={panelRef} className="relative">
            {/* ── Botón campana ──────────────────────────────────────────────────── */}
            <button
                type="button"
                onClick={handleToggle}
                aria-label={
                    noLeidos > 0
                        ? `${noLeidos} evento${noLeidos > 1 ? "s" : ""} de geocerca sin leer`
                        : "Notificaciones de geocerca"
                }
                aria-expanded={abierto}
                aria-haspopup="true"
                className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-lg border transition-all",
                    // Estado conectado/desconectado
                    conectado
                        ? "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                        : "border-slate-200 bg-slate-50 text-slate-400",
                    // Si hay no leídos, resaltar levemente
                    noLeidos > 0 && "border-emerald-300 bg-emerald-50 text-emerald-600",
                )}
            >
                {conectado ? (
                    <Bell className="h-4 w-4" />
                ) : (
                    <BellOff className="h-4 w-4" aria-label="Sin conexión de eventos" />
                )}

                {/* Badge de no leídos — solo visible si hay eventos pendientes */}
                {noLeidos > 0 && (
                    <span
                        aria-hidden="true"
                        className={cn(
                            "absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center",
                            "rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white",
                            // Animación de "pulso" para llamar la atención — solo una vez
                            "animate-bounce",
                        )}
                    >
                        {noLeidos > 99 ? "99+" : noLeidos}
                    </span>
                )}
            </button>

            {/* ── Panel de notificaciones ────────────────────────────────────────── */}
            {abierto && (
                <div
                    role="dialog"
                    aria-label="Panel de notificaciones de geocerca"
                    className={cn(
                        "absolute right-0 top-11 z-50 w-80 rounded-xl border border-slate-200",
                        "bg-white shadow-xl shadow-slate-900/10",
                        // Animación de entrada sutil (no brusca — Nielsen #4)
                        "animate-in fade-in slide-in-from-top-2 duration-150",
                    )}
                >
                    {/* Header del panel */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                            <h3 className="text-sm font-semibold text-slate-800">
                                Eventos de geocerca
                            </h3>
                            {/* Indicador de conexión */}
                            <span
                                className={cn(
                                    "h-2 w-2 rounded-full",
                                    conectado ? "bg-emerald-400" : "bg-slate-300",
                                )}
                                title={conectado ? "Conectado" : "Sin conexión"}
                                aria-label={conectado ? "Conectado en tiempo real" : "Sin conexión"}
                            />
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Limpiar todos */}
                            {eventos.length > 0 && (
                                <button
                                    type="button"
                                    onClick={limpiarEventos}
                                    title="Limpiar todos los eventos"
                                    aria-label="Limpiar todos los eventos"
                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                >
                                    <CheckCheck className="h-4 w-4" />
                                </button>
                            )}
                            {/* Cerrar panel */}
                            <button
                                type="button"
                                onClick={() => setAbierto(false)}
                                title="Cerrar panel"
                                aria-label="Cerrar panel de notificaciones"
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Lista de eventos */}
                    <div className="max-h-80 overflow-y-auto overscroll-contain">
                        {eventos.length === 0 ? (
                            // Estado vacío — informativo, no frustrante (Nielsen #1)
                            <div className="flex flex-col items-center gap-2 py-8 text-center">
                                <MapPin className="h-8 w-8 text-slate-300" aria-hidden="true" />
                                <p className="text-sm text-slate-500">
                                    Sin eventos recientes
                                </p>
                                <p className="text-xs text-slate-400">
                                    {conectado
                                        ? "Los eventos de geocerca aparecerán aquí"
                                        : "Conectando al servidor de eventos..."}
                                </p>
                            </div>
                        ) : (
                            <ul
                                aria-label="Lista de eventos de geocerca"
                                className="divide-y divide-slate-50 p-2"
                            >
                                {eventos.map((evento) => (
                                    <EventoItem key={evento.clientId} evento={evento} />
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Footer con conteo */}
                    {eventos.length > 0 && (
                        <div className="border-t border-slate-100 px-4 py-2">
                            <p className="text-center text-xs text-slate-400">
                                {eventos.length} evento{eventos.length > 1 ? "s" : ""} en esta sesión
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};