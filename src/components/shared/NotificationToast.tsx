import { useState } from 'react';
import { useNotificationStore, type Notification } from '@/stores/notificationStore';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

const typeConfig: Record<Notification['type'], { icon: React.ReactNode; color: string }> = {
  info: {
    icon: <Info className="h-5 w-5" />,
    color: 'bg-blue-50 border-blue-200 text-blue-800',
  },
  success: {
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    color: 'bg-amber-50 border-amber-200 text-amber-800',
  },
  error: {
    icon: <AlertCircle className="h-5 w-5" />,
    color: 'bg-rose-50 border-rose-200 text-rose-800',
  },
};

const NotificationItem = ({ notification }: { notification: Notification }) => {
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const [isLeaving, setIsLeaving] = useState(false);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => removeNotification(notification.id), 200);
  };

  const config = typeConfig[notification.type];

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-200 ${config.color
        } ${isLeaving ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
    >
      <div className="shrink-0">{config.icon}</div>
      <p className="flex-1 text-sm font-medium">{notification.message}</p>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Cerrar notificación"
        className="shrink-0 rounded-md p-1 hover:bg-black/5"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const NotificationToast = () => {
  const notifications = useNotificationStore((state) => state.notifications);

  return (
    <>
      {/* Región polite — anuncia éxito, info y advertencias sin interrumpir */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2"
      >
        {notifications
          .filter((n) => n.type !== 'error')
          .map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
      </div>

      {/* Región assertive — anuncia errores inmediatamente interrumpiendo */}
      <div
        aria-live="assertive"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2"
      >
        {notifications
          .filter((n) => n.type === 'error')
          .map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
      </div>
    </>
  );
};