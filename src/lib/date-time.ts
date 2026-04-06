const APP_TIMEZONE = "America/Mexico_City";

const hasExplicitTimezone = (value: string) => {
  return /([zZ]|[+-]\d{2}:\d{2})$/.test(value);
};

export const parseApiDate = (value?: string | null): Date | null => {
  if (!value) return null;

  const normalized = hasExplicitTimezone(value) ? value : `${value}Z`;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

export const formatAppDateTime = (value?: string | null) => {
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

export const formatElapsedTimeFromApiDate = (value?: string | null) => {
  const date = parseApiDate(value);

  if (!date) return "Sin reporte";

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

  const days = Math.floor(diffSeconds / 86400);
  const hours = Math.floor((diffSeconds % 86400) / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  if (days > 0) return `${days}D ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};