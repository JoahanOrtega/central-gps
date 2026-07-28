import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NOTIFICACIONES_KEY } from "@/features/notifications/hooks/useNotificaciones";
import { useAuthStore } from "@/stores/authStore";
import { useCompanyStore } from "@/stores/companyStore";
import { usePoiEventsStore } from "@/stores/poiEventsStore";
import type { PoiEvent, TipoEventoPoi } from "@/stores/poiEventsStore";
import { useUnitAlertsStore } from "@/stores/unitAlertsStore";
import type { UnitStateAlert, TipoAlertaEstado } from "@/stores/unitAlertsStore";

const API_URL = import.meta.env.VITE_API_URL ?? "";

const BACKOFF_BASE_MS = 2_000;
const BACKOFF_MAX_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;

/**
 * Deriva la URL del WebSocket a partir de VITE_API_URL.
 * http://host:5000  → ws://host:5000/events/ws
 * https://host      → wss://host/events/ws
 */
const resolverWsUrl = (): string => {
    // Si API_URL es relativo (vacío), usar el origen actual del navegador.
    const base = API_URL || window.location.origin;
    const wsBase = base.replace(/^http/i, "ws");
    return `${wsBase}/events/ws`;
};

export const usePoiEvents = (): void => {
    const queryClient = useQueryClient();
    const token = useAuthStore((state) => state.token);
    const user = useAuthStore((state) => state.user);
    const currentCompany = useCompanyStore((state) => state.currentCompany);
    const agregarEvento = usePoiEventsStore((state) => state.agregarEvento);
    const agregarAlerta = useUnitAlertsStore((state) => state.agregarAlerta);
    const setConectado = usePoiEventsStore((state) => state.setConectado);

    const wsRef = useRef<WebSocket | null>(null);
    const backoffRef = useRef<number>(BACKOFF_BASE_MS);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const desmontadoRef = useRef(false);

    /**
     * Resuelve el id_empresa para la conexión.
     * Prioridad:
     *   1. JWT — usuarios normales y admin_empresa tienen empresa fija
     *   2. companyStore.currentCompany — sudo_erp seleccionó una empresa
     */
    const resolverIdEmpresa = useCallback((): number | null => {
        if (user?.id_empresa) return user.id_empresa;
        if (currentCompany?.id_empresa) return currentCompany.id_empresa;
        return null;
    }, [user, currentCompany]);

    const cerrarConexion = useCallback(() => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        if (wsRef.current) {
            // Evitar que el onclose dispare reconexión durante un cierre manual.
            wsRef.current.onclose = null;
            wsRef.current.close();
            wsRef.current = null;
        }
        setConectado(false);
    }, [setConectado]);

    const abrirConexion = useCallback(() => {
        const currentToken = useAuthStore.getState().token;
        if (!currentToken) return;
        if (desmontadoRef.current) return;

        const idEmpresa = resolverIdEmpresa();
        if (!idEmpresa) return; // sudo_erp sin empresa seleccionada aún

        cerrarConexion();

        const ws = new WebSocket(resolverWsUrl());
        wsRef.current = ws;

        ws.onopen = () => {
            // Autenticación: primer mensaje con el JWT y la empresa.
            // (A diferencia del SSE, el token NO va en la URL.)
            ws.send(
                JSON.stringify({
                    type: "auth",
                    token: currentToken,
                    id_empresa: idEmpresa,
                }),
            );
        };

        ws.onmessage = (event: MessageEvent) => {
            let msg: Record<string, unknown>;
            try {
                msg = JSON.parse(event.data);
            } catch {
                return; // mensaje malformado — ignorar sin romper
            }

            switch (msg.type) {
                case "connected":
                    setConectado(true);
                    backoffRef.current = BACKOFF_BASE_MS;
                    break;

                case "heartbeat":
                    break; // mantiene viva la conexión, nada que hacer

                case "poi_event": {
                    const raw = msg as Omit<
                        PoiEvent,
                        "clientId" | "recibido_en" | "leido"
                    >;
                    if (!raw.tipo_evento || !raw.id_unidad || !raw.id_poi) return;
                    agregarEvento({
                        ...raw,
                        tipo_evento: raw.tipo_evento as TipoEventoPoi,
                        detalles:
                            typeof raw.detalles === "string"
                                ? JSON.parse(raw.detalles)
                                : raw.detalles ?? null,
                    });
                    break;
                }

                case "unit_state_event": {
                    const raw = msg as Omit<
                        UnitStateAlert,
                        "clientId" | "recibido_en"
                    >;
                    if (!raw.tipo_evento || !raw.id_unidad) return;
                    // El worker persiste este mismo evento como notificación:
                    // invalidar la key hace que el badge de la campanita
                    // suba EN VIVO sin esperar el refetch de respaldo.
                    queryClient.invalidateQueries({
                        queryKey: [NOTIFICACIONES_KEY],
                    });
                    agregarAlerta({
                        ...raw,
                        tipo_evento: raw.tipo_evento as TipoAlertaEstado,
                    });
                    break;
                }

                case "error":
                    console.warn("[usePoiEvents] Error del servidor WS:", msg.message);
                    break;

                default:
                    break; // tipo desconocido — ignorar
            }
        };

        ws.onclose = () => {
            wsRef.current = null;
            setConectado(false);
            if (desmontadoRef.current) return;
            // Reconexión con backoff exponencial.
            const delay = backoffRef.current;
            backoffRef.current = Math.min(
                backoffRef.current * BACKOFF_MULTIPLIER,
                BACKOFF_MAX_MS,
            );
            retryTimerRef.current = setTimeout(() => {
                if (!desmontadoRef.current) abrirConexion();
            }, delay);
        };

        ws.onerror = () => {
            // onerror siempre va seguido de onclose, que maneja la reconexión.
            // Cerrar aquí fuerza el ciclo de reconexión de forma consistente.
            ws.close();
        };
    }, [resolverIdEmpresa, cerrarConexion, agregarEvento, agregarAlerta, setConectado]);

    // Reconectar cuando cambia token O empresa activa (sudo_erp cambia empresa)
    useEffect(() => {
        desmontadoRef.current = false;
        if (token) {
            abrirConexion();
        } else {
            cerrarConexion();
        }
        return () => {
            desmontadoRef.current = true;
            cerrarConexion();
        };
    }, [token, currentCompany?.id_empresa, abrirConexion, cerrarConexion]);
};