/**
 * UnitStateAlertToast.tsx — Toasts de alertas de estado crítico de unidades.
 *
 * Mismo patrón visual y de comportamiento que PoiEventToast (Nielsen #4,
 * consistencia): esquina inferior IZQUIERDA (los de POI viven en la derecha
 * — así nunca se tapan entre sí), auto-dismiss con pausa en hover, máximo
 * 3 visibles, tono de audio distintivo por tipo.
 *
 * Tipos:
 *   20 → Apagado prolongado  (rojo, ícono power)
 *   21 → Sin transmisión GPS (ámbar, ícono wifi-off)
 *
 * Auto-dismiss a 10s (vs 6s de POIs): estas alertas son operativamente
 * más graves y menos frecuentes — merecen más tiempo en pantalla.
 */
import { useEffect, useRef, useState } from "react";
import { PowerOff, WifiOff, X } from "lucide-react";
import {
    useUnitAlertsStore,
    type UnitStateAlert,
    type TipoAlertaEstado,
} from "@/stores/unitAlertsStore";
import { cn } from "@/lib/utils";
import { formatCalendar } from "@/lib/date-time";


const AUTO_DISMISS_MS = 10_000;
const MAX_TOASTS_VISIBLES = 3;

// ── Configuración visual y sonora por tipo ────────────────────────────────────
const CONFIG_POR_TIPO: Record<
    TipoAlertaEstado,
    {
        borde: string;
        bg: string;
        icono: string;
        titulo: string;
        Icon: typeof PowerOff;
        /** Frecuencia del tono (Hz) — grave = severidad. */
        tono: number;
    }
> = {
    20: {
        borde: "border-l-red-500",
        bg: "bg-red-50",
        icono: "text-red-500",
        titulo: "Apagado prolongado",
        Icon: PowerOff,
        tono: 392, // Sol4 — grave, distinto a todos los tonos de POI
    },
    21: {
        borde: "border-l-amber-500",
        bg: "bg-amber-50",
        icono: "text-amber-600",
        titulo: "Sin transmisión GPS",
        Icon: WifiOff,
        tono: 494, // Si4
    },
};

// ── Beep sintético (Web Audio API) ────────────────────────────────────────────
// Duplicado consciente de PoiEventToast::reproducirTono — candidato a
// extraerse a src/lib/audio-tone.ts cuando haya un tercer consumidor
// (regla de tres antes de abstraer).
function reproducirTono(frecuencia: number, duracion = 0.2, volumen = 0.3): void {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(frecuencia, ctx.currentTime);
        gain.gain.setValueAtTime(volumen, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracion);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duracion);
        osc.onended = () => ctx.close();
    } catch {
        // Audio bloqueado por el navegador — silenciar
    }
}

// ── Toast individual ──────────────────────────────────────────────────────────
const AlertToastItem = ({
    alerta,
    onCerrar,
}: {
    alerta: UnitStateAlert;
    onCerrar: (clientId: string) => void;
}) => {
    const cfg = CONFIG_POR_TIPO[alerta.tipo_evento];
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        timerRef.current = setTimeout(() => onCerrar(alerta.clientId), AUTO_DISMISS_MS);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [alerta.clientId, onCerrar]);

    // Pausa del auto-dismiss en hover — el usuario está leyendo (Nielsen #3)
    const pausar = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };
    const reanudar = () => {
        timerRef.current = setTimeout(() => onCerrar(alerta.clientId), AUTO_DISMISS_MS);
    };

    return (
        <div
            role="alert"
            aria-live="assertive"
            onMouseEnter={pausar}
            onMouseLeave={reanudar}
            className={cn(
                "relative flex w-72 items-start gap-3 rounded-lg border border-l-4 p-3 shadow-lg",
                cfg.borde,
                cfg.bg,
                "animate-in slide-in-from-left-4 fade-in duration-200",
            )}
        >
            <cfg.Icon className={cn("mt-0.5 h-4 w-4 shrink-0", cfg.icono)} aria-hidden="true" />

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                    Unidad {alerta.numero_unidad}
                </p>
                <p className={cn("text-xs font-medium", cfg.icono)}>{cfg.titulo}</p>
                <p className="truncate text-xs text-slate-500">{formatCalendar(alerta.fecha_hora_evento)}</p>
            </div>

            <button
                type="button"
                onClick={() => onCerrar(alerta.clientId)}
                aria-label="Cerrar alerta"
                className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
                <X className="h-3.5 w-3.5" />
            </button>

            <div
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-0.5 rounded-bl-lg bg-slate-200"
                style={{ width: "100%", animation: `shrink ${AUTO_DISMISS_MS}ms linear forwards` }}
            />
        </div>
    );
};

// ── Contenedor (montar UNA vez en HomeLayout) ─────────────────────────────────
export const UnitStateAlertToastContainer = () => {
    const alertas = useUnitAlertsStore((s) => s.alertas);
    const [visibles, setVisibles] = useState<string[]>([]);
    const ultimoClientIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (alertas.length === 0) return;
        const ultima = alertas[0];
        if (!ultima || ultima.clientId === ultimoClientIdRef.current) return;

        ultimoClientIdRef.current = ultima.clientId;
        setVisibles((prev) => [ultima.clientId, ...prev].slice(0, MAX_TOASTS_VISIBLES));
        reproducirTono(CONFIG_POR_TIPO[ultima.tipo_evento]?.tono ?? 392);
    }, [alertas]);

    const handleCerrar = (clientId: string) =>
        setVisibles((prev) => prev.filter((id) => id !== clientId));

    const alertasVisibles = visibles
        .map((id) => alertas.find((a) => a.clientId === id))
        .filter((a): a is UnitStateAlert => a !== undefined);

    if (alertasVisibles.length === 0) return null;

    return (
        <>
            <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
            {/* Esquina inferior IZQUIERDA — los toasts de POI ocupan la derecha */}
            <div
                aria-label="Alertas de estado de unidades"
                className="fixed bottom-4 left-4 z-50 flex flex-col-reverse gap-2"
            >
                {alertasVisibles.map((a) => (
                    <AlertToastItem key={a.clientId} alerta={a} onCerrar={handleCerrar} />
                ))}
            </div>
        </>
    );
};