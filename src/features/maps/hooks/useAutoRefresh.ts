import { useEffect, useRef } from 'react';

interface UseAutoRefreshOptions {
  callback: () => void | Promise<void>;
  intervalMs: number;
  enabled: boolean;
  immediate?: boolean;
}

// ── Hook de refresco automático con protección anti-solapamiento ──
//
// Problema que resuelve:
//   Sin protección, si el callback tarda más que el intervalo se
//   acumulan peticiones en paralelo — el servidor recibe N requests
//   simultáneos y el estado se actualiza en orden impredecible.
//
// Solución:
//   El flag `isRunning` garantiza que solo haya una ejecución activa
//   a la vez. Si el tick del intervalo se dispara mientras el callback
//   anterior sigue corriendo, simplemente lo ignora y espera el siguiente.
//
// Uso:
//   useAutoRefresh({
//     callback: loadUnits,   // función async que carga datos
//     intervalMs: 15_000,    // cada 15 segundos
//     enabled: panelAbierto, // pausar cuando el panel está cerrado
//     immediate: true,       // ejecutar inmediatamente al activarse
//   });
export const useAutoRefresh = ({
  callback,
  intervalMs,
  enabled,
  immediate = true,
}: UseAutoRefreshOptions) => {
  // Siempre apunta al callback más reciente sin reiniciar el intervalo
  const savedCallback = useRef(callback);
  const intervalRef = useRef<number | null>(null);

  // Flag que indica si hay una ejecución en curso — previene solapamiento
  const isRunning = useRef(false);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    // Wrapper que protege contra solapamiento antes de cada ejecución
    const runSafe = async () => {
      if (isRunning.current) return;

      isRunning.current = true;
      try {
        await savedCallback.current();
      } finally {
        // Siempre liberar el flag, incluso si el callback lanzó un error
        isRunning.current = false;
      }
    };

    if (immediate) {
      void runSafe();
    }

    intervalRef.current = window.setInterval(() => {
      void runSafe();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Limpiar el flag al desmontar para evitar memory leaks
      isRunning.current = false;
    };
  }, [enabled, intervalMs, immediate]);
};