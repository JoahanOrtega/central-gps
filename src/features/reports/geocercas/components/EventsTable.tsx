// SRP: solo presentación. No conoce paginación, filtros, ni queries.
// Recibe `eventos` ya listos para pintar.

import { formatAppDateTimeShort } from "@/lib/date-time";
import { cn } from "@/lib/utils";
import {
    TIPOS_EVENTO_CONFIG,
    type EventoGeocerca,
    type TipoEventoGeocerca,
    type TipoEventoConfig,
} from "../types/eventos.types";

interface EventsTableProps {
    eventos: EventoGeocerca[];
}

export const EventsTable = ({ eventos }: EventsTableProps) => (
    <>
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
                <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                        <th scope="col" className="px-4 py-3">Fecha / Hora</th>
                        <th scope="col" className="px-4 py-3">Unidad</th>
                        <th scope="col" className="px-4 py-3">POI</th>
                        <th scope="col" className="px-4 py-3">Evento</th>
                        <th scope="col" className="px-4 py-3">Detalle</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {eventos.map((ev) => (
                        <EventoRow key={ev.id_evento} evento={ev} />
                    ))}
                </tbody>
            </table>
        </div>

        {/* Mobile */}
        <div className="space-y-3 md:hidden">
            {eventos.map((ev) => (
                <EventoCard key={ev.id_evento} evento={ev} />
            ))}
        </div>
    </>
);

// ── Fallback de configuración visual para tipos desconocidos ────────────────
// Si llega un tipo_evento que no está en TIPOS_EVENTO_CONFIG (futuro tipo
// que el backend agregó pero el frontend no), evitamos crashear.

const FALLBACK_CONFIG: TipoEventoConfig = {
    label: "",
    color: "text-slate-600",
    bg: "bg-slate-100",
    dot: "bg-slate-400",
    grupo: "geocerca",
};

const getEventConfig = (evento: EventoGeocerca): TipoEventoConfig => {
    const cfg = TIPOS_EVENTO_CONFIG[evento.tipo_evento];
    if (cfg) return cfg;
    return { ...FALLBACK_CONFIG, label: evento.descripcion };
};

// ── Parser de payload defensivo ──────────────────────────────────────────────
// El payload viene como string JSON del backend. Si está mal formado, no
// queremos que la fila entera reviente; devolvemos null y mostramos "—".

const parsePayload = (raw: string | null): Record<string, unknown> | null => {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return null;
    }
};

// ── Sub-componentes ─────────────────────────────────────────────────────────

interface EventoItemProps {
    evento: EventoGeocerca;
}

const EventoBadge = ({
    config,
    size = "md",
}: {
    config: TipoEventoConfig;
    size?: "sm" | "md";
}) => (
    <span
        className={cn(
            "inline-flex items-center gap-1.5 rounded-full font-medium",
            size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-xs",
            config.bg,
            config.color,
        )}
    >
        <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
        {config.label}
    </span>
);

const EventoRow = ({ evento }: EventoItemProps) => {
    const config = getEventConfig(evento);
    const payload = parsePayload(evento.payload);

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
                {evento.nombre_poi ?? (
                    <span className="text-slate-400 italic text-xs">Sin POI</span>
                )}
            </td>
            <td className="px-4 py-3">
                <EventoBadge config={config} />
            </td>
            <td className="px-4 py-3 text-xs text-slate-500">
                {payload ? (
                    <DetallePayload payload={payload} tipo={evento.tipo_evento} />
                ) : (
                    "—"
                )}
            </td>
        </tr>
    );
};

const EventoCard = ({ evento }: EventoItemProps) => {
    const config = getEventConfig(evento);

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
                <span className="text-xs text-slate-500">
                    {formatAppDateTimeShort(evento.fecha_hora_gmt)}
                </span>
                <EventoBadge config={config} size="sm" />
            </div>
            <p className="font-medium text-slate-800">
                {evento.numero_unidad}
                {evento.marca_unidad && (
                    <span className="ml-1 text-xs font-normal text-slate-400">
                        {evento.marca_unidad}
                    </span>
                )}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
                {evento.nombre_poi ?? <span className="italic">Sin POI</span>}
            </p>
        </article>
    );
};

// ── Renderer del detalle según el tipo de evento ────────────────────────────
// Mantengo la misma lógica del archivo original. Cada tipo de evento tiene
// un layout específico — esto es un strategy pattern simple.

interface DetallePayloadProps {
    payload: Record<string, unknown>;
    tipo: TipoEventoGeocerca;
}

const DetallePayload = ({ payload, tipo }: DetallePayloadProps) => {
    // Helper para leer un número del payload (defensivo: si no es número, "—")
    const num = (key: string): string => {
        const v = payload[key];
        return typeof v === "number" ? String(v) : "—";
    };

    if (tipo === 3) {
        return (
            <span>
                {num("velocidad_actual")} km/h · máx {num("vel_max")} km/h
            </span>
        );
    }

    if (tipo === 4) {
        const dist = payload.distancia_km;
        return (
            <span>
                máx {num("vel_max_alcanzada")} km/h · {num("duracion_segundos")}s
                {typeof dist === "number" ? ` · ${dist} km` : ""}
            </span>
        );
    }

    if (tipo === 12 || tipo === 13) {
        const limite = payload.minutos_permitidos ?? payload.minutos_requeridos;
        return (
            <span>
                {num("minutos_dentro")} min dentro / {tipo === 12 ? "máx" : "mín"}{" "}
                {limite !== undefined ? String(limite) : "—"} min
            </span>
        );
    }

    if (tipo === 15) {
        return (
            <span>
                máx {num("vel_max_alcanzada")} km/h · {num("duracion_segundos")}s
            </span>
        );
    }

    return null;
};