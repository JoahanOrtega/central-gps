import { apiFetch } from "@/lib/api";
import type { NotificacionesResponse } from "./notification.types";

/** Últimas notificaciones del usuario en la empresa activa + badge. */
export const getNotificaciones = (idEmpresa: number) =>
    apiFetch<NotificacionesResponse>(
        `/notifications?id_empresa=${idEmpresa}&limit=20`,
    );

/**
 * Marca notificaciones como leídas. Sin ids → marca TODAS las de la
 * empresa (el "Marcar todas" del panel).
 */
export const marcarLeidas = (idEmpresa: number, ids?: number[]) =>
    apiFetch<{ actualizadas: number }>("/notifications/read", {
        method: "POST",
        // Objeto crudo: apiFetch serializa el body internamente — pasarle
        // JSON.stringify aquí produce doble serialización y el backend
        // recibe un string en vez de un dict (400 silencioso).
        body: ids ? { id_empresa: idEmpresa, ids } : { id_empresa: idEmpresa },
    });
