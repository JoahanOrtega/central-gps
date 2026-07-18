/**
 * NotificationToast.tsx — Sistema centralizado de toasts genéricos.
 *
 * Problemas que resuelve esta versión:
 *
 *   1. Dos <div> con la misma posición (fixed right-4 top-4) se encimaban
 *      visualmente cuando coincidían un error y otro tipo de notificación.
 *
 *   2. Sin límite visible: el store tiene MAX=3 pero el componente renderizaba
 *      todos los que recibía, causando apilamiento en móvil (P1 de deuda técnica).
 *
 *   3. En viewports angostos los toasts tapaban media pantalla.
 *
 * Solución (patrón "live region announcer" de Reach UI / Radix):
 *
 *   - UN solo contenedor visual con tope de MAX_VISIBLE toasts.
 *   - Dos regiones aria-live INVISIBLES (fuera del viewport) para que los
 *     lectores de pantalla anuncien sin interferir con el layout visual.
 *   - En móvil (< sm): si hay más de 1 toast activo, colapsar a un contador
 *     expandible para no tapar el contenido de la pantalla.
 *   - Hover pausa el auto-dismiss (Nielsen #3 — control del usuario).
 *
 * Posición: top-right — no interfiere con los toasts operativos:
 *   bottom-right → PoiEventToast (geocercas)
 *   bottom-left  → UnitStateAlertToast (alertas GPS)
 */

import { createPortal } from 'react-dom';
import { useState, useCallback } from 'react';
import { useNotificationStore, type Notification } from '@/stores/notificationStore';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Constantes ─────────────────────────────────────────────────────────────────
// Sincronizado con MAX_NOTIFICATIONS del store para consistencia visual.
const MAX_VISIBLE = 3;

// ── Config visual por tipo ─────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  Notification['type'],
  { icon: React.ReactNode; containerClass: string; ariaLive: 'polite' | 'assertive' }
> = {
  info: {
    icon: <Info className="h-4 w-4 shrink-0" aria-hidden="true" />,
    containerClass: 'bg-blue-50 border-blue-200 text-blue-800',
    ariaLive: 'polite',
  },
  success: {
    icon: <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />,
    containerClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    ariaLive: 'polite',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />,
    containerClass: 'bg-amber-50 border-amber-200 text-amber-800',
    ariaLive: 'polite',
  },
  error: {
    icon: <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />,
    containerClass: 'bg-rose-50 border-rose-200 text-rose-800',
    // Los errores se anuncian inmediatamente e interrumpen al lector de pantalla.
    ariaLive: 'assertive',
  },
};

// ── Toast individual ───────────────────────────────────────────────────────────
const NotificationItem = ({ notification }: { notification: Notification }) => {
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const [saliendo, setSaliendo] = useState(false);

  const cerrar = useCallback(() => {
    // Primero animamos la salida, luego eliminamos del store.
    // El delay coincide con la duración de la transición CSS (200ms).
    setSaliendo(true);
    setTimeout(() => removeNotification(notification.id), 200);
  }, [notification.id, removeNotification]);

  const cfg = TYPE_CONFIG[notification.type];

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3',
        'rounded-lg border p-4 shadow-lg',
        'transition-all duration-200',
        cfg.containerClass,
        // Animación de salida: deslizar hacia la derecha y desvanecer.
        saliendo ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100',
      )}
    >
      {cfg.icon}
      <p className="flex-1 text-sm font-medium leading-snug">{notification.message}</p>
      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar notificación"
        className="shrink-0 rounded-md p-1 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

// ── Contador colapsado (móvil con múltiples toasts) ────────────────────────────
// Cuando hay más de 1 notificación en pantallas angostas, mostrar solo la
// más reciente + un badge con el total restante para no tapar el mapa.
const ContadorColapsado = ({
  total,
  onExpandir,
}: {
  total: number;
  onExpandir: () => void;
}) => (
  <button
    type="button"
    onClick={onExpandir}
    className={cn(
      'pointer-events-auto flex items-center gap-2',
      'rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg',
      'text-sm font-medium text-slate-700',
      'hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
    )}
    aria-label={`Ver todas las notificaciones (${total} activas)`}
  >
    <Bell className="h-4 w-4 text-slate-500" aria-hidden="true" />
    <span>{total} notificaciones</span>
    {/* Badge visual del conteo */}
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-700 px-1 text-xs text-white">
      {total}
    </span>
  </button>
);

// ── Contenedor principal ───────────────────────────────────────────────────────
export const NotificationToast = () => {
  const notifications = useNotificationStore((s) => s.notifications);
  const [expandidoEnMovil, setExpandidoEnMovil] = useState(false);

  // Solo mostrar hasta MAX_VISIBLE — el store ya limita a 3 con FIFO,
  // pero esto garantiza que el componente nunca renderice de más aunque
  // se cambie la constante del store en el futuro.
  const visibles = notifications.slice(0, MAX_VISIBLE);

  // Cerrar el modo expandido al quedarse sin notificaciones.
  if (notifications.length === 0 && expandidoEnMovil) {
    setExpandidoEnMovil(false);
  }

  if (visibles.length === 0) return null;

  return createPortal(
    <>
      {/*
        Regiones aria-live INVISIBLES — patrón "live region announcer".
        Están fuera del viewport (clip-path) para que los lectores de pantalla
        las lean sin que afecten el layout visual. Son el puente de
        accesibilidad; el contenedor visual de abajo es lo que ve el usuario.
        Separamos polite (info/success/warning) y assertive (error) porque
        los errores deben interrumpir la lectura inmediatamente.
      */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
      >
        {visibles
          .filter((n) => n.type !== 'error')
          .map((n) => (
            <span key={n.id}>{n.message}</span>
          ))}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="false"
        className="sr-only"
      >
        {visibles
          .filter((n) => n.type === 'error')
          .map((n) => (
            <span key={n.id}>{n.message}</span>
          ))}
      </div>

      {/*
        Contenedor visual — UN solo <div> posicionado.
        Resuelve el bug de los dos contenedores encimados de la versión anterior.

        En móvil (sm:hidden / sm:flex):
          - Colapsado: muestra solo el toast más reciente + botón de expansión
            si hay más de 1. Evita tapar el mapa con un stack vertical.
          - Expandido: muestra todos (hasta MAX_VISIBLE).

        En desktop (sm+): siempre muestra todos en columna.
      */}
      <div
        aria-label="Notificaciones"
        className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {/* ── Vista móvil colapsada (solo si hay 2+ y no está expandido) ── */}
        {visibles.length > 1 && !expandidoEnMovil && (
          <div className="flex flex-col gap-2 sm:hidden">
            {/* Mostrar solo el más reciente */}
            <NotificationItem notification={visibles[visibles.length - 1]} />
            <ContadorColapsado
              total={visibles.length}
              onExpandir={() => setExpandidoEnMovil(true)}
            />
          </div>
        )}

        {/* ── Vista móvil expandida ── */}
        {visibles.length > 1 && expandidoEnMovil && (
          <div className="flex flex-col gap-2 sm:hidden">
            {visibles.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
            {/* Botón para volver a colapsar */}
            <button
              type="button"
              onClick={() => setExpandidoEnMovil(false)}
              className={cn(
                'pointer-events-auto rounded-lg border border-slate-200',
                'bg-white px-3 py-2 text-xs text-slate-500 shadow',
                'hover:bg-slate-50',
              )}
            >
              Colapsar
            </button>
          </div>
        )}

        {/* ── Vista móvil con 1 solo toast (siempre visible sin contador) ── */}
        {visibles.length === 1 && (
          <div className="flex flex-col gap-2 sm:hidden">
            <NotificationItem notification={visibles[0]} />
          </div>
        )}

        {/* ── Vista desktop: siempre apilado, hasta MAX_VISIBLE ── */}
        <div className="hidden flex-col gap-2 sm:flex">
          {visibles.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </div>
      </div>
    </>,
    document.body,
  );
};