// src/components/shared/ErrorBanner.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Banner de error unificado para errores de carga de datos.
//
// Heurísticas UX aplicadas:
//   H1 (visibilidad del estado): título claro + descripción + acciones.
//   H9 (recuperarse de errores): la acción depende del tipo de error.
//   H4 (consistencia): un solo componente para todos los errores de carga
//                      en toda la app — antes había banners hechos a mano.
//
// Tipos de error que distinguimos:
//   "validation" (4xx 422)  → el usuario debe corregir filtros, no reintentar.
//   "client"     (otros 4xx)→ probablemente sesión o permisos, no reintentar.
//   "server"     (5xx)      → ofrecer reintentar.
//   "network"    (sin red)  → ofrecer reintentar.
//   "unknown"    (fallback) → ofrecer reintentar.
// ─────────────────────────────────────────────────────────────────────────────

import { AlertCircle, AlertTriangle, RotateCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ErrorKind = "validation" | "client" | "server" | "network" | "unknown";

interface ErrorBannerProps {
    kind?: ErrorKind;
    title?: string;
    message: string;
    /** Detalles por campo (sólo se muestra para kind="validation") */
    fieldErrors?: Record<string, string>;
    onRetry?: () => void;
    className?: string;
}

const KIND_CONFIG: Record<ErrorKind, {
    Icon: typeof AlertCircle;
    defaultTitle: string;
    container: string;
    iconColor: string;
    titleColor: string;
    messageColor: string;
    canRetry: boolean;
}> = {
    validation: {
        Icon: AlertTriangle,
        defaultTitle: "Revisa los filtros",
        container: "border-amber-200 bg-amber-50",
        iconColor: "text-amber-600",
        titleColor: "text-amber-900",
        messageColor: "text-amber-800",
        canRetry: false,
    },
    client: {
        Icon: AlertCircle,
        defaultTitle: "No se pudo completar la solicitud",
        container: "border-orange-200 bg-orange-50",
        iconColor: "text-orange-600",
        titleColor: "text-orange-900",
        messageColor: "text-orange-800",
        canRetry: false,
    },
    server: {
        Icon: AlertCircle,
        defaultTitle: "El servidor no respondió correctamente",
        container: "border-red-200 bg-red-50",
        iconColor: "text-red-600",
        titleColor: "text-red-900",
        messageColor: "text-red-800",
        canRetry: true,
    },
    network: {
        Icon: WifiOff,
        defaultTitle: "Sin conexión",
        container: "border-slate-200 bg-slate-50",
        iconColor: "text-slate-600",
        titleColor: "text-slate-900",
        messageColor: "text-slate-700",
        canRetry: true,
    },
    unknown: {
        Icon: AlertCircle,
        defaultTitle: "Ocurrió un error inesperado",
        container: "border-red-200 bg-red-50",
        iconColor: "text-red-600",
        titleColor: "text-red-900",
        messageColor: "text-red-800",
        canRetry: true,
    },
};

export const ErrorBanner = ({
    kind = "unknown",
    title,
    message,
    fieldErrors,
    onRetry,
    className,
}: ErrorBannerProps) => {
    const cfg = KIND_CONFIG[kind];
    const showRetry = cfg.canRetry && onRetry;

    return (
        <div
            role="alert"
            aria-live="polite"
            className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-sm",
                cfg.container,
                className,
            )}
        >
            <cfg.Icon className={cn("mt-0.5 h-5 w-5 shrink-0", cfg.iconColor)} />

            <div className="flex-1 min-w-0">
                <p className={cn("font-semibold", cfg.titleColor)}>
                    {title ?? cfg.defaultTitle}
                </p>
                <p className={cn("mt-0.5", cfg.messageColor)}>{message}</p>

                {fieldErrors && Object.keys(fieldErrors).length > 0 && (
                    <ul className={cn("mt-2 space-y-0.5 text-xs", cfg.messageColor)}>
                        {Object.entries(fieldErrors).map(([campo, msg]) => (
                            <li key={campo} className="flex gap-1">
                                <span className="font-medium capitalize">{campo}:</span>
                                <span>{msg}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {showRetry && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="shrink-0"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reintentar
                </Button>
            )}
        </div>
    );
};

// ── Clasificador de errores ──────────────────────────────────────────────────
// Convierte un Error genérico en un ErrorKind para que la UI elija el banner
// correcto. Se basa en la propiedad opcional `.status` que pondremos en
// ApiError (ver parche de api.ts).

interface ErrorConStatus extends Error {
    status?: number;
    fieldErrors?: Record<string, string>;
}

export const clasificarError = (
    error: unknown,
): { kind: ErrorKind; message: string; fieldErrors?: Record<string, string> } => {
    if (!error) {
        return { kind: "unknown", message: "Error desconocido" };
    }

    const err = error as ErrorConStatus;
    const message = err.message ?? "Ocurrió un error";

    // Sin red — fetch lanza TypeError("Failed to fetch")
    if (err.name === "TypeError" && /fetch/i.test(message)) {
        return { kind: "network", message: "Verifica tu conexión a internet" };
    }

    if (typeof err.status === "number") {
        if (err.status === 422) {
            return { kind: "validation", message, fieldErrors: err.fieldErrors };
        }
        if (err.status >= 400 && err.status < 500) {
            return { kind: "client", message };
        }
        if (err.status >= 500) {
            return { kind: "server", message };
        }
    }

    return { kind: "unknown", message };
};