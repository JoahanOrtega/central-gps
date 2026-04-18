import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { appRouter } from "./router/AppRouter";
import { NotificationToast } from "@/components/shared/NotificationToast";
import "./index.css";

// ── QueryClient global ────────────────────────────────────────────────────────
// Una sola instancia compartida por toda la app.
//
// Configuración por defecto:
//   staleTime: 5 minutos — los datos se consideran frescos durante 5 min.
//     En catálogos (operadores, grupos, modelos AVL) esto significa que
//     abrir el modal de nueva unidad 3 veces seguidas solo hace 1 petición.
//
//   gcTime: 10 minutos — los datos sin observadores se eliminan de caché
//     tras 10 min. Permite recuperar datos rápidamente si el usuario
//     navega a otra sección y regresa.
//
//   retry: 1 — reintentar una vez en caso de error de red antes de fallar.
//     En producción con conexiones inestables, 1 reintento cubre la mayoría
//     de errores transitorios sin impactar la experiencia del usuario.
//
//   refetchOnWindowFocus: false — no recargar datos automáticamente al
//     volver a la ventana. Los catálogos cambian poco y el refresco
//     automático causaría peticiones innecesarias al cambiar de pestaña.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,          // 5 minutos
      gcTime: 10 * 60 * 1000,             // 10 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <NotificationToast />
      <RouterProvider router={appRouter} />
    </QueryClientProvider>
  </React.StrictMode>,
);