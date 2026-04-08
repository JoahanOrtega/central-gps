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

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const newNotification: Notification = {
    ...notification,
    id,
    duration: notification.duration ?? 3000,
  };

  set((state) => ({
    notifications: [...state.notifications, newNotification],
  }));

  // Auto-eliminar después de la duración (solo si está definida y es mayor que 0)
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

// Helpers para tipos específicos
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