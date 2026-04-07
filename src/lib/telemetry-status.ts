export const TELEMETRY_STATUS = {
    OFF: "000000000",
    ON: "100000000",
} as const;

export type TelemetryMapState =
    | "apagado"
    | "detenido"
    | "movimiento"
    | "Sin Telemetría";

export type TelemetryStatusMeta = {
    code: string;
    label: string;
    shortLabel: string;
    color: string;
    mapState: TelemetryMapState;
};

const DEFAULT_STATUS_META: TelemetryStatusMeta = {
    code: "",
    label: "Sin telemetría",
    shortLabel: "N/A",
    color: "#94a3b8",
    mapState: "Sin Telemetría",
};

export const getTelemetryStatusMeta = (
    status?: string | null,
    speed?: number | null,
): TelemetryStatusMeta => {
    const code = (status || "").trim();
    const safeSpeed = speed ?? 0;

    if (!code) {
        return DEFAULT_STATUS_META;
    }

    if (code === TELEMETRY_STATUS.OFF) {
        return {
            code,
            label: "Apagada",
            shortLabel: "OFF",
            color: "#ef4444",
            mapState: "apagado",
        };
    }

    if (code === TELEMETRY_STATUS.ON) {
        if (safeSpeed >= 1) {
            return {
                code,
                label: "En movimiento",
                shortLabel: "MOV",
                color: "#22c55e",
                mapState: "movimiento",
            };
        }

        return {
            code,
            label: "Encendida",
            shortLabel: "ON",
            color: "#f59e0b",
            mapState: "detenido",
        };
    }

    return {
        code,
        label: `Estado ${code}`,
        shortLabel: code,
        color: "#64748b",
        mapState: "Sin Telemetría",
    };
};

export const getTelemetryStatusLabel = (
    status?: string | null,
    speed?: number | null,
) => {
    return getTelemetryStatusMeta(status, speed).label;
};

export const getTelemetryStatusShortLabel = (
    status?: string | null,
    speed?: number | null,
) => {
    return getTelemetryStatusMeta(status, speed).shortLabel;
};

export const getTelemetryStatusColor = (
    status?: string | null,
    speed?: number | null,
) => {
    return getTelemetryStatusMeta(status, speed).color;
};

export const getTelemetryMapState = (
    status?: string | null,
    speed?: number | null,
) => {
    return getTelemetryStatusMeta(status, speed).mapState;
};

export const isTelemetryOff = (status?: string | null) =>
    (status || "").trim() === TELEMETRY_STATUS.OFF;

export const isTelemetryOn = (status?: string | null) =>
    (status || "").trim() === TELEMETRY_STATUS.ON;