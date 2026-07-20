// Contrato espejo de GET /notifications (backend: notification_routes.py)

export interface NotificacionItem {
    id: number;
    tipo: number; // 21 = sin reportar; catálogo compartido con eventos
    titulo: string;
    mensaje: string | null;
    id_unidad: number | null;
    leida: boolean;
    fecha: string | null; // ISO con offset -06:00
}

export interface NotificacionesResponse {
    items: NotificacionItem[];
    no_leidas: number;
}
