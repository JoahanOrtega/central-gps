import { create } from 'zustand';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number; // en ms, por defecto 3000
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

// ── Límite máximo de toasts visibles simultáneamente ─────────────────────────
// Previene que errores en loops o en hooks con refresco automático
// (ej: useAutoRefresh con red caída) apilen docenas de toasts que
// bloqueen la interfaz y confundan al usuario.
// Si se supera el límite, se descarta el más antiguo (FIFO).
const MAX_NOTIFICATIONS = 3;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 3000,
    };

    set((state) => {
      const current = state.notifications;

      // ── Deduplicación ────────────────────────────────────────────────────
      // Si ya existe un toast con el mismo mensaje y tipo, no agregar uno nuevo.
      // Cubre el caso de errores repetitivos (ej: fallo de red en polling)
      // que de otro modo generarían toasts idénticos apilados.
      const isDuplicate = current.some(
        (n) => n.message === newNotification.message && n.type === newNotification.type
      );
      if (isDuplicate) return state;

      // ── Límite FIFO ───────────────────────────────────────────────────────
      // Si ya hay MAX_NOTIFICATIONS toasts, descartar el más antiguo (índice 0)
      // para hacer espacio al nuevo. El usuario siempre ve los más recientes.
      const trimmed =
        current.length >= MAX_NOTIFICATIONS
          ? current.slice(-(MAX_NOTIFICATIONS - 1))
          : current;

      return { notifications: [...trimmed, newNotification] };
    });

    // Auto-eliminar después de la duración configurada
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () => set({ notifications: [] }),
}));

// ── Helpers para tipos específicos ────────────────────────────────────────────
// Acceso directo sin necesidad de importar useNotificationStore en cada lugar.
export const notify = {
  info: (message: string, duration?: number) =>
    useNotificationStore.getState().addNotification({ message, type: 'info', duration }),
  success: (message: string, duration?: number) =>
    useNotificationStore.getState().addNotification({ message, type: 'success', duration }),
  warning: (message: string, duration?: number) =>
    useNotificationStore.getState().addNotification({ message, type: 'warning', duration }),
  error: (message: string, duration?: number) =>
    useNotificationStore.getState().addNotification({ message, type: 'error', duration }),
};