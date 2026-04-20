import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno según el modo (development, production, etc.)
  // Necesario para leer VITE_API_URL y construir la CSP dinámicamente.
  const env = loadEnv(mode, process.cwd(), "");

  const apiUrl = env.VITE_API_URL || "http://localhost:5000";
  const isDev = mode !== "production";

  // ── Content Security Policy ─────────────────────────────────
  // Se construye dinámicamente según el modo:
  //
  //   DEV: permite cualquier localhost (puerto y hostname) para no romperse
  //        con cambios de VITE_API_URL ni con herramientas del dev server.
  //        Incluye ws://localhost:* para el HMR de Vite.
  //
  //   PRODUCCIÓN: estricto, solo la URL exacta del backend de producción.
  //
  // Directivas:
  //   default-src 'self'
  //     → Por defecto solo recursos del mismo origen.
  //
  //   script-src 'self' 'unsafe-inline' maps.googleapis.com maps.gstatic.com
  //     → Scripts propios + Google Maps SDK (requiere unsafe-inline).
  //     → En producción con nonce configurado, se puede quitar unsafe-inline.
  //
  //   style-src 'self' 'unsafe-inline' fonts.googleapis.com
  //     → Tailwind genera estilos inline — unsafe-inline necesario.
  //
  //   img-src 'self' data: blob: *.googleapis.com *.gstatic.com
  //     → Imágenes propias + tiles de Google Maps.
  //
  //   connect-src (según entorno, ver abajo).
  //
  //   frame-src 'none'  → Impide embeber la app en iframes (clickjacking).
  //   object-src 'none' → Deshabilita plugins obsoletos (Flash, etc.).
  //
  // En producción replicar estos headers en nginx:
  //   add_header Content-Security-Policy "...";
  //   add_header Content-Security-Policy "... font-src 'self' fonts.gstatic.com data: ...";
  //   add_header X-Content-Type-Options "nosniff";
  //   add_header X-Frame-Options "DENY";
  //   add_header Referrer-Policy "strict-origin-when-cross-origin";
  //   add_header Permissions-Policy "geolocation=(self), camera=(), microphone=()";
  // ────────────────────────────────────────────────────────────

  // connect-src: en dev usa comodines de localhost para no sufrir con
  // variaciones de puerto, cambios de VITE_API_URL ni el ws:// del HMR.
  // En producción es estricto: solo el apiUrl configurado.
  const connectSrc = isDev
    ? [
      "'self'",
      "http://localhost:*",
      "http://127.0.0.1:*",
      // ws y wss para el canal de HMR de Vite (hot reload tras guardar)
      "ws://localhost:*",
      "ws://127.0.0.1:*",
      "https://maps.googleapis.com",
    ].join(" ")
    : `'self' ${apiUrl} https://maps.googleapis.com`;

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' maps.googleapis.com maps.gstatic.com",
    // worker-src: Vite usa Workers con blob: URL para el HMR (Hot Module
    // Replacement). Sin esta directiva, Firefox aplica el fallback de
    // script-src y bloquea la creación del Worker, rompiendo la reconexión
    // del cliente de HMR cuando se guarda un archivo.
    // En producción no es necesario si no usas Workers propios — pero
    // mantenerlo 'self' + blob: es seguro: bloquea orígenes externos.
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    // Google Maps carga fuentes desde fonts.gstatic.com — sin esta directiva
    // el navegador cae al default-src 'self' y bloquea las fuentes del mapa
    "font-src 'self' fonts.gstatic.com data:",
    "img-src 'self' data: blob: *.googleapis.com *.gstatic.com",
    `connect-src ${connectSrc}`,
    "frame-src 'none'",
    "object-src 'none'",
  ].join("; ");

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    server: {
      headers: {
        "Content-Security-Policy": csp,
        // Impide que el navegador adivine el tipo MIME — previene MIME sniffing
        "X-Content-Type-Options": "nosniff",
        // Impide que la app sea embebida en iframes — previene clickjacking
        "X-Frame-Options": "DENY",
        // Controla cuánta información de referrer se envía en las peticiones
        "Referrer-Policy": "strict-origin-when-cross-origin",
        // Restringe el acceso a APIs del navegador
        "Permissions-Policy": "geolocation=(self), camera=(), microphone=()",
      },
    },
  };
});