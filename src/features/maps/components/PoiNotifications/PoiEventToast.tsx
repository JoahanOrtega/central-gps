/**
 * features/maps/components/PoiNotifications/PoiEventToast.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Toast de notificación que aparece cuando llega un evento de geocerca.
 *
 * Diseño:
 *   - Se muestra en la esquina inferior derecha (no interrumpe el mapa).
 *   - Se auto-descarta a los 6 segundos.
 *   - Reproduce un sonido suave al aparecer.
 *   - Se apila si llegan varios eventos rápido (max 3 visibles).
 *
 * Sonido:
 *   Usa Web Audio API para generar un "beep" suave sintético — sin
 *   dependencia de archivos de audio externos. El tono varía por tipo
 *   de evento para que el operador pueda distinguirlos auditivamente
 *   (incluso sin ver la pantalla).
 *
 * Heurísticas UX aplicadas:
 *   - Nielsen #1 (Visibilidad): notificación inmediata del evento.
 *   - Nielsen #3 (Control): el usuario puede cerrar el toast manualmente.
 *   - Nielsen #4 (Consistencia): mismo diseño visual que los toasts del
 *     sistema en otras partes de la app.
 *   - Ley de Prägnanz: diseño simple — icono + unidad + POI + hora.
 *     No se muestra todo el detalle (eso está en el panel de la campana).
 *   - Auto-dismiss a 6s: tiempo suficiente para leer sin bloquear.
 */

import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { usePoiEventsStore } from "@/stores/poiEventsStore";
import type { PoiEvent, TipoEventoPoi } from "@/stores/poiEventsStore";
import { cn } from "@/lib/utils";

// ── Duración del auto-dismiss en ms ──────────────────────────────────────────
const AUTO_DISMISS_MS = 6_000;
// Máximo de toasts visibles al mismo tiempo
const MAX_TOASTS_VISIBLES = 3;

// ── Tono por tipo de evento (frecuencia en Hz) ────────────────────────────────
// Frecuencias más altas = más urgente.
// El operador aprende a distinguirlos con el uso (retroalimentación auditiva).
const TONO_POR_TIPO: Record<TipoEventoPoi, number> = {
    10: 880,  // Entró — La5 (tono positivo, agudo suave)
    11: 440,  // Salió — La4 (tono neutro)
    12: 660,  // Permanencia máxima — Mi5 (alerta media)
    13: 550,  // Permanencia mínima — Do#5 (alerta media-baja)
    14: 990,  // Velocidad excedida — Si5 (más urgente)
    15: 330,  // Velocidad normalizada — Mi4 (resolución, grave)
};

// ── Colores por tipo de evento ────────────────────────────────────────────────
const COLOR_POR_TIPO: Record<
    TipoEventoPoi,
    { borde: string; bg: string; icono: string; texto: string }
> = {
    10: { borde: "border-l-emerald-500", bg: "bg-white", icono: "text-emerald-500", texto: "Entró al POI" },
    11: { borde: "border-l-slate-400", bg: "bg-white", icono: "text-slate-500", texto: "Salió del POI" },
    12: { borde: "border-l-amber-500", bg: "bg-amber-50", icono: "text-amber-500", texto: "Permanencia excedida" },
    13: { borde: "border-l-orange-500", bg: "bg-orange-50", icono: "text-orange-500", texto: "Permanencia insuficiente" },
    14: { borde: "border-l-red-500", bg: "bg-red-50", icono: "text-red-500", texto: "Exceso de velocidad" },
    15: { borde: "border-l-blue-400", bg: "bg-blue-50", icono: "text-blue-500", texto: "Velocidad normalizada" },
};

// ── Utilidad: reproducir beep sintético con Web Audio API ─────────────────────

/**
 * Reproduce un tono corto usando Web Audio API.
 * No requiere archivos de audio — el tono se genera en tiempo real.
 * Silencia errores si el navegador bloquea el audio (requiere interacción previa).
 *
 * @param frecuencia - Frecuencia del tono en Hz
 * @param duracion   - Duración en segundos. Default: 0.15s
 * @param volumen    - Volumen de 0 a 1. Default: 0.3 (sutil)
 */
function reproducirTono(
    frecuencia: number,
    duracion = 0.15,
    volumen = 0.3,
): void {
    try {
        const ctx = new AudioContext();
        const oscilador = ctx.createOscillator();
        const ganancia = ctx.createGain();

        oscilador.connect(ganancia);
        ganancia.connect(ctx.destination);

        oscilador.type = "sine";  // Sine es más suave que square o sawtooth
        oscilador.frequency.setValueAtTime(frecuencia, ctx.currentTime);

        // Fade-out suave para evitar el "click" al cortar abruptamente
        ganancia.gain.setValueAtTime(volumen, ctx.currentTime);
        ganancia.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracion);

        oscilador.start(ctx.currentTime);
        oscilador.stop(ctx.currentTime + duracion);

        // Cerrar el contexto cuando el oscilador termina para liberar recursos
        oscilador.onended = () => ctx.close();
    } catch {
        // Web Audio API no disponible o bloqueada por el navegador — silenciar
    }
}

// ── Sub-componente: un toast individual ───────────────────────────────────────

interface ToastItemProps {
    evento: PoiEvent;
    onCerrar: (clientId: string) => void;
}

const ToastItem = ({ evento, onCerrar }: ToastItemProps) => {
    const cfg = COLOR_POR_TIPO[evento.tipo_evento];
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Iniciar auto-dismiss al montar
    useEffect(() => {
        timerRef.current = setTimeout(() => {
            onCerrar(evento.clientId);
        }, AUTO_DISMISS_MS);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [evento.clientId, onCerrar]);

    // Pausar auto-dismiss en hover (el usuario está leyendo)
    const handleMouseEnter = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };
    const handleMouseLeave = () => {
        timerRef.current = setTimeout(() => {
            onCerrar(evento.clientId);
        }, AUTO_DISMISS_MS);
    };

    return (
        <div
            role="alert"
            aria-live="polite"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
                // Layout base
                "relative flex w-72 items-start gap-3 rounded-lg border border-l-4 p-3 shadow-lg",
                // Colores por tipo
                cfg.borde,
                cfg.bg,
                // Animación de entrada
                "animate-in slide-in-from-right-4 fade-in duration-200",
            )}
        >
            {/* Ícono */}
            <MapPin
                className={cn("mt-0.5 h-4 w-4 shrink-0", cfg.icono)}
                aria-hidden="true"
            />

            {/* Contenido */}
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                    {evento.numero_unidad}
                </p>
                <p className={cn("text-xs font-medium", cfg.icono)}>
                    {cfg.texto}
                </p>
                <p className="truncate text-xs text-slate-500">
                    {evento.nombre_poi}
                </p>
            </div>

            {/* Botón cerrar */}
            <button
                type="button"
                onClick={() => onCerrar(evento.clientId)}
                aria-label="Cerrar notificación"
                className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
                <X className="h-3.5 w-3.5" />
            </button>

            {/* Barra de progreso del auto-dismiss */}
            <div
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-0.5 rounded-bl-lg bg-slate-200"
                style={{
                    width: "100%",
                    animation: `shrink ${AUTO_DISMISS_MS}ms linear forwards`,
                }}
            />
        </div>
    );
};

// ── Componente principal: contenedor de toasts ────────────────────────────────

/**
 * Contenedor de toasts de eventos POI.
 *
 * Se monta UNA VEZ en HomeLayout — no dentro del mapa.
 * Escucha el store de eventos y muestra un toast por cada evento nuevo.
 * Limita a MAX_TOASTS_VISIBLES para no abrumar la pantalla.
 */
export const PoiEventToastContainer = () => {
    const eventos = usePoiEventsStore((s) => s.eventos);
    // Estado local: IDs de toasts actualmente visibles
    const [visibles, setVisibles] = useState<string[]>([]);
    // Ref para saber qué evento fue el último procesado
    const ultimoClientIdRef = useRef<string | null>(null);

    // ── Detectar eventos nuevos y mostrar toast ───────────────────────────────
    useEffect(() => {
        if (eventos.length === 0) return;

        const ultimo = eventos[0]; // eventos[0] es el más reciente (store ordena DESC)
        if (!ultimo || ultimo.clientId === ultimoClientIdRef.current) return;

        ultimoClientIdRef.current = ultimo.clientId;

        // Agregar al inicio de visibles, respetar el máximo
        setVisibles((prev) => {
            const nuevos = [ultimo.clientId, ...prev].slice(0, MAX_TOASTS_VISIBLES);
            return nuevos;
        });

        // Reproducir tono según tipo de evento
        const frecuencia = TONO_POR_TIPO[ultimo.tipo_evento] ?? 440;
        reproducirTono(frecuencia);

    }, [eventos]);

    const handleCerrar = (clientId: string) => {
        setVisibles((prev) => prev.filter((id) => id !== clientId));
    };

    // Obtener los eventos que corresponden a los IDs visibles
    const eventosVisibles = visibles
        .map((id) => eventos.find((e) => e.clientId === id))
        .filter((e): e is PoiEvent => e !== undefined);

    if (eventosVisibles.length === 0) return null;

    return (
        <>
            {/* Keyframe para la barra de progreso del auto-dismiss */}
            <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

            {/* Posicionado en esquina inferior derecha — no tapa el mapa */}
            <div
                aria-label="Notificaciones de geocerca"
                className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2"
            >
                {eventosVisibles.map((evento) => (
                    <ToastItem
                        key={evento.clientId}
                        evento={evento}
                        onCerrar={handleCerrar}
                    />
                ))}
            </div>
        </>
    );
};