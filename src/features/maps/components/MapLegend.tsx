// ══════════════════════════════════════════════════════════════════════════════
// MapLegend.tsx — Botón + popover con la leyenda de colores del mapa
// ══════════════════════════════════════════════════════════════════════════════
//
// Heurística Nielsen #10 (Ayuda y documentación): el esquema de dos ejes del
// marcador (centro = estado del motor, borde = salud del dispositivo) es
// potente pero NO autoexplicativo. Esta leyenda lo documenta dentro del
// propio mapa, accesible en un clic, sin obligar al usuario a memorizar.
//
// ── Una sola fuente de verdad ─────────────────────────────────────────────────
// Los colores y umbrales se importan de telemetry-status.ts. Si mañana
// cambia el umbral de apagado prolongado o un color, la leyenda se
// actualiza sola — nunca queda desincronizada de la lógica real.
//
// ── Componente autocontenido ──────────────────────────────────────────────────
// Incluye su propio botón y maneja su propio estado de apertura.
// Integración en MapToolbar: <MapLegend /> y listo, sin prop drilling.
// ══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import {
    UNIT_COLORS,
    APAGADO_PROLONGADO_SEGS,
} from "../lib/telemetry-status";

// ── Estilo del botón (mismo patrón que MapToolbar) ───────────────────────────
const toolbarButtonClass =
    "flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700";

// ── Umbral legible para humanos ───────────────────────────────────────────────
// Derivado del valor real para que la leyenda nunca mienta.
const HORAS_APAGADO_PROLONGADO = Math.round(APAGADO_PROLONGADO_SEGS / 3600);

// ── Swatch: círculo que imita el marcador real (fill + stroke) ────────────────
interface SwatchProps {
    fill: string;
    stroke: string;
}

const MarkerSwatch = ({ fill, stroke }: SwatchProps) => (
    <span
        aria-hidden="true"
        className="inline-block h-4 w-4 flex-shrink-0 rounded-full"
        style={{
            backgroundColor: fill,
            border: `3px solid ${stroke}`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
        }}
    />
);

// ── Fila de la leyenda: swatch + descripción ──────────────────────────────────
interface LegendRowProps {
    fill: string;
    stroke: string;
    label: string;
    detail?: string;
}

const LegendRow = ({ fill, stroke, label, detail }: LegendRowProps) => (
    <li className="flex items-start gap-2.5 py-1">
        <span className="mt-0.5">
            <MarkerSwatch fill={fill} stroke={stroke} />
        </span>
        <span className="text-xs leading-snug text-slate-700">
            <span className="font-medium">{label}</span>
            {detail && <span className="block text-[11px] text-slate-400">{detail}</span>}
        </span>
    </li>
);

// ── Encabezado de sección dentro del popover ──────────────────────────────────
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400 first:mt-0">
        {children}
    </p>
);

/**
 * Botón de ayuda + popover con la leyenda de colores de los marcadores.
 *
 * El popover se cierra con:
 *   - Clic fuera del componente
 *   - Tecla Escape
 *   - Clic de nuevo en el botón (toggle)
 *
 * Accesibilidad: aria-expanded en el botón, aria-label descriptivo,
 * role="dialog" en el popover.
 */
export const MapLegend = () => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // ── Cerrar con clic fuera ───────────────────────────────────────────────
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    // ── Cerrar con Escape (control y libertad del usuario, Nielsen #3) ──────
    useEffect(() => {
        if (!open) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [open]);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                className={toolbarButtonClass}
                title="Leyenda de colores"
                aria-label="Mostrar leyenda de colores de los marcadores"
                aria-expanded={open}
                onClick={() => setOpen((prev) => !prev)}
            >
                <CircleHelp className="h-4 w-4" />
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="Leyenda de colores del mapa"
                    className="absolute right-0 top-12 z-50 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
                >
                    <p className="mb-2 text-sm font-semibold text-slate-800">
                        ¿Qué significan los colores?
                    </p>

                    {/* ── Eje 1: centro del marcador = estado del motor ── */}
                    <SectionTitle>Centro — estado del motor</SectionTitle>
                    <ul>
                        <LegendRow
                            fill={UNIT_COLORS.VERDE}
                            stroke={UNIT_COLORS.BLANCO}
                            label="Encendida"
                            detail="En movimiento o en relentí"
                        />
                        <LegendRow
                            fill={UNIT_COLORS.GRIS_OSCURO}
                            stroke={UNIT_COLORS.BLANCO}
                            label="Apagada"
                            detail="Apagado normal (fin de jornada, pernocta)"
                        />
                        <LegendRow
                            fill={UNIT_COLORS.ROJO}
                            stroke={UNIT_COLORS.BLANCO}
                            label="Apagada — prolongado"
                            detail={`Más de ${HORAS_APAGADO_PROLONGADO} horas sin encender`}
                        />
                        <LegendRow
                            fill={UNIT_COLORS.GRIS}
                            stroke={UNIT_COLORS.BLANCO}
                            label="Sin telemetría"
                            detail="El sistema no tiene datos de esta unidad"
                        />
                    </ul>

                    {/* ── Eje 2: borde del marcador = salud del dispositivo ── */}
                    <SectionTitle>Borde — salud del dispositivo GPS</SectionTitle>
                    <ul>
                        <LegendRow
                            fill={UNIT_COLORS.GRIS_OSCURO}
                            stroke={UNIT_COLORS.VERDE}
                            label="Transmitiendo"
                            detail="Último reporte hace menos de 5 min"
                        />
                        <LegendRow
                            fill={UNIT_COLORS.GRIS_OSCURO}
                            stroke={UNIT_COLORS.AMBAR}
                            label="Retraso leve"
                            detail="Entre 5 y 6 min sin reportar"
                        />
                        <LegendRow
                            fill={UNIT_COLORS.GRIS_OSCURO}
                            stroke={UNIT_COLORS.ROJO}
                            label="Sin señal o exceso de velocidad"
                            detail="Más de 6 min sin reportar, o supera su límite"
                        />
                    </ul>

                    {/* ── Nota de lectura combinada ── */}
                    <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] leading-snug text-slate-400">
                        Los dos colores son independientes: el centro indica el motor,
                        el borde indica si el equipo GPS está vivo.
                    </p>
                </div>
            )}
        </div>
    );
};