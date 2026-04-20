// ── Zona horaria de la aplicación ────────────────────────────────────────────
// Todas las fechas que vienen de la BD están en UTC.
// La aplicación opera en UTC-6 (America/Mexico_City).
// SIEMPRE convertir con esta constante — nunca hardcodear "-6".
export const APP_TIMEZONE = "America/Mexico_City";

// ── Parser base ───────────────────────────────────────────────────────────────

/**
 * Convierte una cadena de fecha del backend a un objeto Date.
 * Retorna null si el valor está vacío o no es válido.
 *
 * El backend serializa con to_app_iso() que produce ISO 8601 con offset:
 *   "2024-03-15T08:30:00-06:00"
 *
 * new Date() entiende este formato directamente — NO añadir "Z"
 * porque convertiría "-06:00Z" en un formato inválido.
 *
 * También maneja el formato legacy "YYYY-MM-DD HH:mm:ss" (sin offset)
 * que algunos endpoints aún puedan devolver, tratándolo como UTC.
 */
export const parseApiDate = (value?: string | null): Date | null => {
  if (!value) return null;

  const normalized = value.trim();

  // Formato con offset de zona horaria: "2024-03-15T08:30:00-06:00"
  // new Date() lo parsea correctamente — no modificar
  if (normalized.includes("+") || normalized.match(/-\d{2}:\d{2}$/)) {
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Formato ISO sin offset: "2024-03-15T14:30:00"
  // Añadir "Z" para indicar UTC explícitamente
  if (normalized.includes("T")) {
    const withZ = normalized.endsWith("Z") ? normalized : `${normalized}Z`;
    const date = new Date(withZ);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Formato legacy "YYYY-MM-DD HH:mm:ss" (espacio en lugar de T)
  // Tratar como UTC añadiendo T y Z
  const withT = normalized.replace(" ", "T");
  const withZ = `${withT}Z`;
  const date = new Date(withZ);
  return Number.isNaN(date.getTime()) ? null : date;
};

// ── Formato de fecha y hora completo ─────────────────────────────────────────

/**
 * "15/03/2024 08:30:00 a.m." — para mostrar en infoWindows y detalles.
 * Convierte automáticamente de UTC a UTC-6.
 */
export const formatAppDateTime = (value?: string | null): string => {
  const date = parseApiDate(value);
  if (!date) return "Sin fecha";

  return new Intl.DateTimeFormat("es-MX", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
};

/**
 * "15/03/2024 08:30" — formato corto para listas y tablas.
 */
export const formatAppDateTimeShort = (value?: string | null): string => {
  const date = parseApiDate(value);
  if (!date) return "Sin fecha";

  return new Intl.DateTimeFormat("es-MX", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

/**
 * "08:30:00" — solo hora, para el timeline del recorrido.
 */
export const formatTimeOnly = (value?: string | null): string => {
  const date = parseApiDate(value);
  if (!date) return "--:--:--";

  return new Intl.DateTimeFormat("es-MX", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
};

/**
 * "15 mar. 2024" — fecha sin hora, para encabezados del drawer.
 */
export const formatDateOnly = (value?: string | null): string => {
  const date = parseApiDate(value);
  if (!date) return "Sin fecha";

  return new Intl.DateTimeFormat("es-MX", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
};

// ── Tiempo transcurrido ───────────────────────────────────────────────────────

/**
 * Calcula los segundos transcurridos desde una fecha UTC hasta ahora.
 * Retorna null si la fecha es inválida.
 */
export const getElapsedSeconds = (value?: string | null): number | null => {
  const date = parseApiDate(value);
  if (!date) return null;

  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
};

/**
 * "2D 4h" / "3h 15m" / "45m 12s" / "8s"
 *
 * Versión compacta para la tarjeta de la unidad en el drawer.
 * Fiel al PHP legacy (app::fulldatediff).
 */
export const formatElapsedTimeFromApiDate = (value?: string | null): string => {
  const seconds = getElapsedSeconds(value);
  if (seconds === null) return "Sin reporte";
  return formatDuration(seconds);
};

/**
 * Formatea una duración en segundos al formato "Xh Ym Zs".
 * Fiel a la función _duracion() de draw.js del PHP legacy.
 *
 * Diseñada para el indicador "tiempo desde última transmisión" donde los
 * segundos son ruido cuando ya pasaron horas. Para duraciones de rutas
 * donde cada segundo importa, usar formatDurationHms.
 *
 * Ejemplos:
 *   45      → "45s"
 *   125     → "2m 5s"
 *   3670    → "1h 1m"          (sin segundos cuando hay horas)
 *   90000   → "1D 1h"           (sin minutos cuando hay días)
 */
export const formatDuration = (totalSeconds: number): string => {
  const secs = Math.max(0, Math.floor(totalSeconds));

  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  if (days > 0) return `${days}D ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

/**
 * Formatea una duración en segundos al formato "HH:MM:SS" (o "Xd HH:MM:SS").
 * Pensada para duraciones de rutas/trayectos donde cada segundo importa.
 *
 * Diferencia clave vs formatDuration: SIEMPRE incluye segundos. Nunca los
 * omite, aunque haya horas o días. El reloj completo permite al usuario
 * ver duraciones exactas de recorridos cortos (minuto y medio, 45 segundos).
 *
 * Formato con zero-padding para alineación visual en listas verticales
 * (ej: columna de duración en la lista de trips).
 *
 * Ejemplos:
 *   45      → "00:00:45"
 *   125     → "00:02:05"
 *   3670    → "01:01:10"
 *   90000   → "1d 01:00:00"    (un día más HH:MM:SS)
 */
export const formatDurationHms = (totalSeconds: number): string => {
  const secs = Math.max(0, Math.floor(totalSeconds));

  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  // Zero-pad a 2 dígitos para que cada campo ocupe el mismo ancho.
  const pad = (n: number) => n.toString().padStart(2, "0");
  const hms = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return days > 0 ? `${days}d ${hms}` : hms;
};

/**
 * "Hoy a las 08:30:00" / "Ayer a las 22:10:00" / "15/03/2024 08:30:00"
 *
 * Equivalente al formato `moment().calendar()` que usa el PHP legacy.
 * Se usa en el timeline del recorrido y en los infoWindows.
 */
export const formatCalendar = (value?: string | null): string => {
  const date = parseApiDate(value);
  if (!date) return "Sin fecha";

  const nowUtc6 = new Date(
    new Date().toLocaleString("en-US", { timeZone: APP_TIMEZONE }),
  );
  const dateUtc6 = new Date(
    date.toLocaleString("en-US", { timeZone: APP_TIMEZONE }),
  );

  const todayStart = new Date(nowUtc6);
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const time = new Intl.DateTimeFormat("es-MX", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);

  if (dateUtc6 >= todayStart) return `Hoy a las ${time}`;
  if (dateUtc6 >= yesterdayStart) return `Ayer a las ${time}`;

  return new Intl.DateTimeFormat("es-MX", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
};

/**
 * Retorna la fecha en formato YYYY-MM-DD en la zona horaria local (UTC-6).
 * Útil para inicializar inputs de tipo date.
 */
export const todayLocalString = (): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};