import { useEffect, useState } from "react";
import { CircleHelp } from "lucide-react";
import {
    UNIT_COLORS,
    SIN_REPORTE_PROLONGADO_SEGS,
} from "../lib/telemetry-status";

//  Estilo del botón
const toolbarButtonClass =
    "flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700";

const HORAS_SIN_REPORTE = Math.round(SIN_REPORTE_PROLONGADO_SEGS / 3600);

// Swatch: círculo que imita el marcador real (fill + stroke) 
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

// Fila de la leyenda: swatch + descripción 
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

// Encabezado de sección dentro del popover 
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400 first:mt-0">
        {children}
    </p>
);

// Botón de ayuda + popover con la leyenda de colores de los marcadores.
export const MapLegend = () => {
    const [open, setOpen] = useState(false);

    //  Cerrar con Escape (control y libertad del usuario, Nielsen #3) 
    useEffect(() => {
        if (!open) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [open]);

    return (
        <div className="relative">
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
                <>
                    <div
                        className="fixed inset-0 z-40"
                        aria-hidden="true"
                        onClick={() => setOpen(false)}
                    />

                    <div
                        role="dialog"
                        aria-label="Leyenda de colores del mapa"
                        className="fixed left-1/2 top-24 z-50 w-[calc(100vw-2rem)] max-w-xs -translate-x-1/2 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-72 sm:translate-x-0 rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
                    >
                        <p className="mb-2 text-sm font-semibold text-slate-800">
                            ¿Qué significan los colores?
                        </p>

                        {/* centro del marcador = estado del motor */}
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
                                detail={`Más de ${HORAS_SIN_REPORTE} horas sin recibir datos`}
                            />
                            <LegendRow
                                fill={UNIT_COLORS.GRIS}
                                stroke={UNIT_COLORS.BLANCO}
                                label="Sin telemetría"
                                detail="El sistema no tiene datos de esta unidad"
                            />
                        </ul>

                        {/* Nota de lectura */}
                        <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] leading-snug text-slate-400">
                            El color del centro indica el estado del motor de la unidad.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};