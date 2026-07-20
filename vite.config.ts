import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "http://localhost:5000";
  const isDev = mode !== "production";

  // ── CSP (sin cambios respecto a la versión actual) ──────────────────────────
  const connectSrc = isDev
    ? ["'self'", "http://localhost:*", "http://127.0.0.1:*",
      "ws://localhost:*", "ws://127.0.0.1:*",
      "https://maps.googleapis.com"].join(" ")
    : `'self' ${apiUrl} https://maps.googleapis.com`;

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' maps.googleapis.com maps.gstatic.com",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "font-src 'self' fonts.gstatic.com data:",
    "img-src 'self' data: blob: *.googleapis.com *.gstatic.com",
    `connect-src ${connectSrc}`,
    "frame-src 'none'",
    "object-src 'none'",
  ].join("; ");

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },

    // ── Build optimizado ──────────────────────────────────────────────────────
    build: {
      // esbuild es el minificador por defecto de Vite — rápido y sin dependencias extra.
      // drop elimina console.log y debugger en producción sin necesitar Terser.
      minify: "esbuild",
      ...(isDev ? {} : {
        // Solo en producción — eliminar logs y debuggers del bundle
        esbuildOptions: {
          drop: ["console", "debugger"],
        },
      }),

      // CSS code splitting — cada chunk tiene su propio CSS
      cssCodeSplit: true,

      // Chunks separados por dominio de cambio:
      //   vendor/*  → librerías externas (caché largo, cambian poco)
      //   maps      → Google Maps (grande, solo se usa en /maps)
      //   El resto Vite lo divide automáticamente por ruta (lazy imports)
      rollupOptions: {
        output: {
          // Nombres cortos con hash para invalidación de caché correcta
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",

          manualChunks(id) {
            // React + ReactDOM — el chunk más cacheado de todos
            if (id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/")) {
              return "vendor-react";
            }
            // React Router
            if (id.includes("node_modules/react-router")) {
              return "vendor-router";
            }
            // TanStack Query
            if (id.includes("node_modules/@tanstack")) {
              return "vendor-query";
            }
            // UI: lucide + shadcn/radix
            if (id.includes("node_modules/lucide-react") ||
              id.includes("node_modules/@radix-ui") ||
              id.includes("node_modules/radix-ui")) {
              return "vendor-ui";
            }
            // Google Maps — grande, solo se usa en /maps y /operation/routes
            if (id.includes("node_modules/@googlemaps") ||
              id.includes("loadGoogleMaps")) {
              return "vendor-maps";
            }
            // Recharts + su árbol de d3 — solo lo carga el Dashboard,
            // regla del proyecto: cada librería pesada a su propio chunk
            if (id.includes("node_modules/recharts") ||
              id.includes("node_modules/victory-vendor") ||
              id.includes("node_modules/d3-")) {
              return "vendor-recharts";
            }
            // Zustand + Zod — pequeños pero vale separar
            if (id.includes("node_modules/zustand") ||
              id.includes("node_modules/zod")) {
              return "vendor-state";
            }
          },
        },
      },

      // Advertir chunks > 500kB (sin este valor el default es 500kB)
      chunkSizeWarningLimit: 500,
    },

    server: {
      proxy: {
        // Todas las rutas de la API se proxean al Flask en desarrollo
        "/auth": "http://localhost:5000",
        "/operation": "http://localhost:5000",
        "/catalogs": "http://localhost:5000",
        "/monitor": "http://localhost:5000",
        "/companies": "http://localhost:5000",
        "/users": "http://localhost:5000",
        "/units": "http://localhost:5000",
        "/poi": "http://localhost:5000",
        "/pois": "http://localhost:5000",
        "/events": "http://localhost:5000",
        "/erp": "http://localhost:5000",
        "/admin-erp": "http://localhost:5000",
        "/clients": "http://localhost:5000",
        "/telemetry": "http://localhost:5000",
        "/health": "http://localhost:5000",
        // Rastreo público por token (sin sesión). Va al backend como el resto;
        // sin esta entrada Vite la trata como ruta de la SPA y sirve index.html.
        "/public": "http://localhost:5000",
      },
      headers: {
        "Content-Security-Policy": csp,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(self), camera=(), microphone=()",
      },
    },
  };
});