import { useCallback, useEffect, useRef } from "react";
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

export const usePoiEvents = (): void => {
    const token = useAuthStore((state) => state.token);
    const user = useAuthStore((state) => state.user);
    const currentCompany = useCompanyStore((state) => state.currentCompany);
    const agregarEvento = usePoiEventsStore((state) => state.agregarEvento);
    const agregarAlerta = useUnitAlertsStore((state) => state.agregarAlerta);
    const setConectado = usePoiEventsStore((state) => state.setConectado);

    const esRef = useRef<EventSource | null>(null);
    const backoffRef = useRef<number>(BACKOFF_BASE_MS);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const desmontadoRef = useRef(false);

    /**
     * Resuelve el id_empresa para la conexion SSE.
     * Prioridad:
     *   1. JWT — usuarios normales y admin_empresa tienen empresa fija
     *   2. companyStore.currentCompany — sudo_erp selecciono una empresa
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
        if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
        }
        setConectado(false);
    }, [setConectado]);

    const abrirConexion = useCallback(() => {
        const token = useAuthStore.getState().token;
        if (!token) return;
        if (desmontadoRef.current) return;

        const idEmpresa = resolverIdEmpresa();
        if (!idEmpresa) return; // sudo_erp sin empresa seleccionada aun

        cerrarConexion();

        // Pasar id_empresa como param — necesario para sudo_erp
        const params = new URLSearchParams({
            token: token,
            id_empresa: String(idEmpresa),
        });
        const url = `${API_URL}/events/stream?${params.toString()}`;
        const es = new EventSource(url);
        esRef.current = es;

        es.addEventListener("connected", () => {
            setConectado(true);
            backoffRef.current = BACKOFF_BASE_MS;
        });

        es.addEventListener("poi_event", (e: MessageEvent) => {
            try {
                const raw = JSON.parse(e.data) as Omit<PoiEvent, "clientId" | "recibido_en" | "leido">;
                if (!raw.tipo_evento || !raw.id_unidad || !raw.id_poi) return;
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

        es.addEventListener("unit_state_event", (e: MessageEvent) => {
            try {
                const raw = JSON.parse(e.data) as Omit<UnitStateAlert, "clientId" | "recibido_en">;
                // Validación mínima: sin tipo o sin unidad, el evento no sirve
                if (!raw.tipo_evento || !raw.id_unidad) return;
                agregarAlerta({
                    ...raw,
                    tipo_evento: raw.tipo_evento as TipoAlertaEstado,
                });
            } catch {
                // Evento malformado — ignorar sin romper el stream
            }
        });

        es.onerror = () => {
            es.close();
            esRef.current = null;
            setConectado(false);
            if (desmontadoRef.current) return;
            const delay = backoffRef.current;
            backoffRef.current = Math.min(backoffRef.current * BACKOFF_MULTIPLIER, BACKOFF_MAX_MS);
            retryTimerRef.current = setTimeout(() => {
                if (!desmontadoRef.current) abrirConexion();
            }, delay);
        };

    }, [resolverIdEmpresa, cerrarConexion, agregarEvento, setConectado]);

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