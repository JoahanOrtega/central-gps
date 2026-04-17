import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno según el modo (development, production, etc.)
  // Necesario para leer VITE_API_URL y construir la CSP dinámicamente.
  const env = loadEnv(mode, process.cwd(), "");

  const apiUrl = env.VITE_API_URL || "http://127.0.0.1:5000";

  // ── Content Security Policy ─────────────────────────────────
  // Se construye dinámicamente para incluir la URL real del backend.
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
  //   connect-src 'self' <apiUrl> https://maps.googleapis.com
  //     → Peticiones fetch solo al backend (URL dinámica) + Google Maps API.
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
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' maps.googleapis.com maps.gstatic.com",
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    // Google Maps carga fuentes desde fonts.gstatic.com — sin esta directiva
    // el navegador cae al default-src 'self' y bloquea las fuentes del mapa
    
    "font-src 'self' fonts.gstatic.com data:",
    "img-src 'self' data: blob: *.googleapis.com *.gstatic.com",
    `connect-src 'self' ${apiUrl} https://maps.googleapis.com`,
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