/**
 * hooks/usePoiEvents.ts — Conexión SSE para eventos de geocerca en tiempo real
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Responsabilidad:
 *   Mantener abierta la conexión SSE con el backend, recibir los eventos
 *   de geocerca (entrada/salida de POI) y alimentar el store global.
 *
 * Por qué SSE y no polling:
 *   - El backend publica en Redis en el momento exacto de la detección.
 *   - Con SSE el evento llega al frontend en < 1s tras la detección.
 *   - Con polling de 15s habría hasta 15s de latencia adicional.
 *
 * Por qué el token va en query param y no en header:
 *   EventSource nativo del navegador NO permite headers custom.
 *   La alternativa (fetch + ReadableStream manual) es más compleja
 *   y con peor soporte en Safari. El token en query param es el patrón
 *   estándar para SSE con autenticación JWT.
 *   El backend solo acepta el token si es válido — la seguridad no cambia.
 *
 * Reconexión automática:
 *   EventSource reconecta solo automáticamente, pero no con backoff.
 *   Este hook implementa reconexión con backoff exponencial para no
 *   saturar al backend si hay un problema prolongado.
 *
 * Ciclo de vida:
 *   - Se monta en HomeLayout (nivel superior) para que la conexión persista
 *     mientras el usuario navega entre páginas.
 *   - Se desmonta al cerrar sesión (HomeLayout se desmonta).
 *   - Al cambiar de empresa (token nuevo), reconecta con el nuevo token.
 *
 * Heurísticas UX aplicadas:
 *   - Nielsen #1 (Visibilidad del estado): el hook expone `conectado`
 *     para que el navbar muestre el estado de conexión al usuario.
 *   - Nielsen #9 (Ayuda a recuperarse de errores): reconexión automática
 *     con backoff — el usuario no necesita hacer nada si hay un fallo
 *     temporal de red.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { usePoiEventsStore } from "@/stores/poiEventsStore";
import type { PoiEvent, TipoEventoPoi } from "@/stores/poiEventsStore";

const API_URL = import.meta.env.VITE_API_URL ?? "";

// ── Constantes de reconexión ──────────────────────────────────────────────────
const BACKOFF_BASE_MS = 2_000;   // 2s primer reintento
const BACKOFF_MAX_MS = 30_000;  // 30s máximo entre reintentos
const BACKOFF_MULTIPLIER = 2;       // duplicar en cada intento fallido

// ── Hook ──────────────────────────────────────────────────────────────────────

export const usePoiEvents = (): void => {
    const token = useAuthStore((state) => state.token);
    const agregarEvento = usePoiEventsStore((state) => state.agregarEvento);
    const setConectado = usePoiEventsStore((state) => state.setConectado);

    // Refs para controlar el ciclo de vida sin causar re-renders
    const esRef = useRef<EventSource | null>(null);
    const backoffRef = useRef<number>(BACKOFF_BASE_MS);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Ref para saber si el desmontaje fue intencional (logout)
    // vs un error de red que debe reconectar.
    const desmontadoRef = useRef(false);

    /**
     * Cierra la conexión SSE actual y cancela cualquier timer de reconexión.
     * Llamar antes de abrir una nueva conexión o al desmontar.
     */
    const cerrarConexion = useCallback(() => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
        }
        setConectado(false);
    }, [setConectado]);

    /**
     * Abre una nueva conexión SSE al backend.
     * En caso de error, programa un reintento con backoff exponencial.
     */
    const abrirConexion = useCallback(() => {
        if (!token) return;
        if (desmontadoRef.current) return;

        // Cerrar conexión previa si existe (ej: al cambiar de empresa)
        cerrarConexion();

        const url = `${API_URL}/events/stream?token=${encodeURIComponent(token)}`;
        const es = new EventSource(url);
        esRef.current = es;

        // ── Conexión establecida ──────────────────────────────────────────────────
        es.addEventListener("connected", () => {
            setConectado(true);
            // Resetear backoff al conectar exitosamente
            backoffRef.current = BACKOFF_BASE_MS;
        });

        // ── Evento de geocerca recibido ───────────────────────────────────────────
        es.addEventListener("poi_event", (e: MessageEvent) => {
            try {
                const raw = JSON.parse(e.data) as Omit<
                    PoiEvent,
                    "clientId" | "recibido_en" | "leido"
                >;

                // Validación mínima antes de agregar al store
                if (!raw.tipo_evento || !raw.id_unidad || !raw.id_poi) {
                    console.warn("[usePoiEvents] Evento malformado:", raw);
                    return;
                }

                agregarEvento({
                    ...raw,
                    tipo_evento: raw.tipo_evento as TipoEventoPoi,
                    detalles:
                        typeof raw.detalles === "string"
                            ? JSON.parse(raw.detalles)
                            : raw.detalles ?? null,
                });

            } catch (err) {
                console.warn("[usePoiEvents] Error parseando evento SSE:", err);
            }
        });

        // ── Error de conexión / cierre del servidor ───────────────────────────────
        es.onerror = () => {
            // EventSource llama onerror tanto en errores temporales como en cierre.
            // Cerramos manualmente para controlar la reconexión con backoff.
            es.close();
            esRef.current = null;
            setConectado(false);

            if (desmontadoRef.current) return;

            // Programar reconexión con backoff exponencial
            const delay = backoffRef.current;
            backoffRef.current = Math.min(
                backoffRef.current * BACKOFF_MULTIPLIER,
                BACKOFF_MAX_MS,
            );

            retryTimerRef.current = setTimeout(() => {
                if (!desmontadoRef.current) {
                    abrirConexion();
                }
            }, delay);
        };

    }, [token, cerrarConexion, agregarEvento, setConectado]);

    // ── Efecto principal: abrir/reconectar cuando cambia el token ────────────────
    useEffect(() => {
        desmontadoRef.current = false;

        if (token) {
            abrirConexion();
        } else {
            // Sin token (logout) → cerrar sin reconectar
            cerrarConexion();
        }

        return () => {
            // Marcar como desmontado ANTES de cerrar para que onerror no reconecte
            desmontadoRef.current = true;
            cerrarConexion();
        };
    }, [token, abrirConexion, cerrarConexion]);
};