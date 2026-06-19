// Todas las fechas de la BD están en UTC-6 y el pipeline opera en UTC-6 de
// extremo a extremo. Usar siempre esta constante, nunca hardcodear "-6".
export const APP_TIMEZONE = "America/Mexico_City";

// Convierte una cadena de fecha del backend a Date, o null si es inválida.
// El backend serializa con offset ("2024-03-15T08:30:00-06:00"); también se
// contemplan ISO sin offset, RFC 2822 y el legacy "YYYY-MM-DD HH:mm:ss". En
// los formatos sin zona se asume UTC-6 para que new Date() no los lea como UTC.
export const parseApiDate = (value?: string | null): Date | null => {
  if (!value) return null;

  const normalized = value.trim();

  if (normalized.includes("+") || normalized.match(/-\d{2}:\d{2}$/)) {
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (normalized.includes("T")) {
    const withOffset = normalized.endsWith("Z") ? normalized : `${normalized}-06:00`;
    const date = new Date(withOffset);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // RFC 2822: "Mon, 25 May 2026 16:37:31 GMT". new Date() lo parsea directo.
  if (normalized.includes(",") || normalized.endsWith("GMT") || normalized.endsWith("UTC")) {
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Legacy "YYYY-MM-DD HH:mm:ss": se trata como UTC-6.
  const withT = normalized.replace(" ", "T");
  const date = new Date(`${withT}-06:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

// "15/03/2024 08:30:00 a.m." — para infoWindows y detalles.
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

// "15/03/2024 08:30" — formato corto para listas y tablas.
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

// "08:30:00" — solo hora, para el timeline del recorrido.
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

// "15 mar. 2024" — fecha sin hora, para encabezados del drawer.
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

// Segundos transcurridos desde una fecha UTC-6 hasta ahora, o null si inválida.
export const getElapsedSeconds = (value?: string | null): number | null => {
  const date = parseApiDate(value);
  if (!date) return null;

  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
};

// "2D 4h" / "3h 15m" / "45m 12s". Versión compacta para la tarjeta de unidad.
export const formatElapsedTimeFromApiDate = (value?: string | null): string => {
  const seconds = getElapsedSeconds(value);
  if (seconds === null) return "Sin reporte";
  return formatDuration(seconds);
};

// "Xh Ym Zs" — omite los segundos cuando ya hay horas (son ruido en el
// "tiempo desde última transmisión"). Para duraciones de rutas usar
// formatDurationHms, que siempre incluye segundos.
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

// "HH:MM:SS" (o "Xd HH:MM:SS") para duraciones de rutas. A diferencia de
// formatDuration, siempre incluye segundos y usa zero-padding para alinear
// la columna de duración en listas verticales.
export const formatDurationHms = (totalSeconds: number): string => {
  const secs = Math.max(0, Math.floor(totalSeconds));

  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  const hms = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return days > 0 ? `${days}d ${hms}` : hms;
};

// "Hoy a las 08:30:00" / "Ayer a las 22:10:00" / "15/03/2024 08:30:00".
// Equivalente al moment().calendar() del legacy.
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

// Fecha de hoy en formato YYYY-MM-DD (zona UTC-6), para inicializar inputs date.
export const todayLocalString = (): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

// Convierte una fecha del backend al YYYY-MM-DD que exige <input type="date">.
// Devuelve "" si llega vacía o inválida. Una fecha que ya viene como YYYY-MM-DD
// se respeta tal cual para no correr el día por el ajuste de zona.
export const toDateInputValue = (value?: string | null): string => {
  if (!value) return "";

  const normalized = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

  const date = parseApiDate(normalized);
  if (!date) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};