import { useState, useEffect, useCallback } from "react";
import { Copy, RefreshCw, Check, Link2Off, Clock, Link2, Timer } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unitService } from "../services/unitService";
import { notify } from "@/stores/notificationStore";

interface UnitTokenTabProps {
    idUnidad: number;
    idEmpresa: number | null;
    canEdit?: boolean;
}

// Componente para mostrar un countdown de expiración del token temporal.
const CountdownBadge = ({
    fechaExpiracion,
    onExpire,
}: {
    fechaExpiracion: string;
    onExpire?: () => void;
}) => {
    const [timeLeft, setTimeLeft] = useState<string | null>(null);
    const [expirado, setExpirado] = useState(false);

    useEffect(() => {
        const target = new Date(fechaExpiracion).getTime();

        const tick = () => {
            const diff = target - Date.now();
            if (diff <= 0) {
                setTimeLeft("Expirado");
                setExpirado(true);
                onExpire?.();
                return false;
            }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${h}h ${m}m ${s}s`);
            return true;
        };

        if (tick()) {
            const interval = setInterval(() => {
                if (!tick()) clearInterval(interval);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [fechaExpiracion, onExpire]);

    if (!timeLeft) return null;

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${expirado ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
            }`}>
            <Clock className="h-3.5 w-3.5" />
            {expirado ? "Expirado" : `Expira en: ${timeLeft}`}
        </span>
    );
};

// Componente para mostrar la URL del token y un botón de copiar al portapapeles.
const TokenUrlDisplay = ({ url }: { url: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            notify.error("No se pudo copiar el enlace");
        }
    };

    return (
        <div className="flex items-center gap-2">
            <input
                readOnly
                value={url}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
            />
            <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 hover:bg-slate-200 disabled:opacity-50"
            >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
        </div>
    );
};

// Opciones de expiración para el token temporal
const expirationOptions = [
    { value: "1", label: "1 hora" },
    { value: "2", label: "2 horas" },
    { value: "4", label: "4 horas" },
    { value: "8", label: "8 horas" },
    { value: "12", label: "12 horas" },
    { value: "24", label: "24 horas" },
    { value: "custom", label: "Personalizado" },
];

// Componente principal
export const UnitTokenTab = ({ idUnidad, idEmpresa, canEdit = false }: UnitTokenTabProps) => {
    const queryClient = useQueryClient();
    const queryKey = ["unit-token", idUnidad, idEmpresa];

    // Estado del selector de expiración temporal
    const [expirationMode, setExpirationMode] = useState<string>("4");
    const [customHours, setCustomHours] = useState("0");
    const [customMinutes, setCustomMinutes] = useState("30");

    // Estado de expiración en vivo del token temporal: si el countdown llegó a cero, aunque el backend aún lo devuelva.
    const [expiroEnVivo, setExpiroEnVivo] = useState(false);
    const handleTemporalExpire = useCallback(() => setExpiroEnVivo(true), []);

    // Query de configuración (trae ambos tokens)
    const { data: config, isLoading } = useQuery({
        queryKey,
        queryFn: () => unitService.getTokenConfig(idUnidad, idEmpresa),
        enabled: idUnidad > 0,
    });

    // Mutaciones del token PERMANENTE
    const generarPermanente = useMutation({
        mutationFn: () => unitService.regenerateToken(idUnidad, idEmpresa),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            notify.success("Enlace permanente generado");
        },
        onError: (e) =>
            notify.error(e instanceof Error ? e.message : "No se pudo generar"),
    });

    const revocarPermanente = useMutation({
        mutationFn: () => unitService.revokeToken(idUnidad, idEmpresa),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            notify.success("Enlace permanente revocado");
        },
        onError: (e) =>
            notify.error(e instanceof Error ? e.message : "No se pudo revocar"),
    });

    // Mutaciones del token TEMPORAL
    const generarTemporal = useMutation({
        mutationFn: () => {
            let minutos: number;
            if (expirationMode === "custom") {
                minutos = (parseInt(customHours) || 0) * 60 + (parseInt(customMinutes) || 0);
            } else {
                minutos = parseInt(expirationMode) * 60;
            }
            return unitService.regenerateTemporalToken(idUnidad, idEmpresa, {
                minutos_expiracion: minutos,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            // Token nuevo = arrancar el countdown desde cero.
            setExpiroEnVivo(false);
            notify.success("Enlace temporal generado");
        },
        onError: (e) =>
            notify.error(e instanceof Error ? e.message : "No se pudo generar"),
    });

    const revocarTemporal = useMutation({
        mutationFn: () => unitService.revokeTemporalToken(idUnidad, idEmpresa),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            notify.success("Enlace temporal revocado");
        },
        onError: (e) =>
            notify.error(e instanceof Error ? e.message : "No se pudo revocar"),
    });

    // Loading
    if (isLoading || !config) {
        return (
            <div className="py-8 text-center text-sm text-slate-400">
                Cargando configuración…
            </div>
        );
    }

    // Datos derivados
    const urlPermanente = config.token
        ? `${window.location.origin}/track/unit/${config.token}`
        : null;

    const urlTemporal = config.token_temporal
        ? `${window.location.origin}/track/unit/${config.token_temporal}`
        : null;

    // El token temporal puede estar expirado aunque el backend aún lo devuelva, porque la expiración es en vivo. Se considera expirado si:
    // 1. Lo indicó el countdown (estado local)
    // 2. La fecha de expiración ya pasó (estado del backend)
    const temporalExpirado =
        expiroEnVivo ||
        (config.fecha_expiracion_temporal
            ? new Date(config.fecha_expiracion_temporal).getTime() < Date.now()
            : false);

    const tienePermamente = Boolean(config.token);
    const tieneTemporal = Boolean(config.token_temporal) && !temporalExpirado;

    const customMinutosTotal =
        (parseInt(customHours) || 0) * 60 + (parseInt(customMinutes) || 0);

    return (
        <div className="space-y-5">
            {/* SECCIÓN 1: Token PERMANENTE */}
            <section className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-slate-400" />
                        <p className="text-sm font-medium text-slate-700">
                            Enlace permanente
                        </p>
                    </div>
                    {tienePermamente && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                            Activo
                        </span>
                    )}
                </div>

                <p className="mb-3 text-xs text-slate-400">
                    Se mantiene activo hasta que lo revoques. Ideal para
                    compartir con clientes fijos o supervisores.
                </p>

                {urlPermanente ? (
                    <TokenUrlDisplay url={urlPermanente} />
                ) : (
                    <p className="text-sm text-slate-400">
                        Aún no se ha generado un enlace permanente.
                    </p>
                )}

                {canEdit && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => generarPermanente.mutate()}
                            disabled={generarPermanente.isPending}
                            className="flex items-center gap-2 rounded-lg bg-sky-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${generarPermanente.isPending ? "animate-spin" : ""}`} />
                            {tienePermamente ? "Regenerar" : "Generar enlace"}
                        </button>

                        {tienePermamente && (
                            <button
                                type="button"
                                onClick={() => revocarPermanente.mutate()}
                                disabled={revocarPermanente.isPending}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                                <Link2Off className="h-4 w-4" />
                                Revocar
                            </button>
                        )}
                    </div>
                )}

                {tienePermamente && canEdit && (
                    <p className="mt-2 text-[11px] text-slate-400">
                        Al regenerar, el enlace anterior deja de funcionar de
                        inmediato.
                    </p>
                )}
            </section>

            {/* SECCIÓN 2: Token TEMPORAL */}
            <section className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-slate-400" />
                        <p className="text-sm font-medium text-slate-700">
                            Enlace temporal
                        </p>
                    </div>
                    {tieneTemporal && config.fecha_expiracion_temporal && (
                        <CountdownBadge
                            fechaExpiracion={config.fecha_expiracion_temporal}
                            onExpire={handleTemporalExpire}
                        />
                    )}
                </div>

                <p className="mb-3 text-xs text-slate-400">
                    Expira automáticamente. Ideal para compartir la ubicación
                    durante una entrega o servicio puntual.
                </p>

                {tieneTemporal && urlTemporal ? (
                    <TokenUrlDisplay url={urlTemporal} />
                ) : (
                    <p className="text-sm text-slate-400">
                        {config.token_temporal && temporalExpirado
                            ? "El enlace anterior expiró y dejó de funcionar. Genera uno nuevo cuando lo necesites."
                            : "Aún no se ha generado un enlace temporal."}
                    </p>
                )}

                {canEdit && (
                    <div className="mt-4 space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        {/* Selector de duración */}
                        <div>
                            <label className="mb-2 block text-xs font-medium text-slate-600">
                                Duración del enlace
                            </label>
                            <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {expirationOptions.map((opt) => (
                                    <label
                                        key={opt.value}
                                        className={`flex cursor-pointer items-center justify-center rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${expirationMode === opt.value
                                            ? "border-sky-500 bg-sky-50 text-sky-700"
                                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="expirationMode"
                                            value={opt.value}
                                            checked={expirationMode === opt.value}
                                            onChange={(e) =>
                                                setExpirationMode(e.target.value)
                                            }
                                            className="sr-only"
                                        />
                                        {opt.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Inputs de horas/minutos personalizados */}
                        {expirationMode === "custom" && (
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] font-semibold uppercase text-slate-400">
                                        Horas
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={customHours}
                                        onChange={(e) =>
                                            setCustomHours(e.target.value)
                                        }
                                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-semibold uppercase text-slate-400">
                                        Minutos
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={customMinutes}
                                        onChange={(e) =>
                                            setCustomMinutes(e.target.value)
                                        }
                                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Botones generar/revocar temporal */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => generarTemporal.mutate()}
                                disabled={
                                    generarTemporal.isPending ||
                                    (expirationMode === "custom" &&
                                        customMinutosTotal <= 0)
                                }
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50 sm:w-auto"
                            >
                                <RefreshCw
                                    className={`h-4 w-4 ${generarTemporal.isPending ? "animate-spin" : ""}`}
                                />
                                {tieneTemporal
                                    ? "Regenerar temporal"
                                    : "Generar enlace temporal"}
                            </button>

                            {tieneTemporal && (
                                <button
                                    type="button"
                                    onClick={() => revocarTemporal.mutate()}
                                    disabled={revocarTemporal.isPending}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                                >
                                    <Link2Off className="h-4 w-4" />
                                    Revocar temporal
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </section>

            {/* SECCIÓN 3: Seguridad */}
            <section className="rounded-xl border border-slate-200 p-4">
                <p className="mb-1 text-sm font-medium text-slate-700">
                    Seguridad del enlace
                </p>
                <div className="flex items-center justify-between gap-4 py-2.5">
                    <div>
                        <p className="text-sm font-medium text-slate-700">
                            Requiere clave de acceso
                        </p>
                        <p className="text-xs text-slate-400">
                            Pide una clave de 6 dígitos al abrir el enlace
                            (próximamente).
                        </p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={config.token_requiere_clave_acceso}
                        disabled
                        onClick={() =>
                            notify.info(
                                "La clave de acceso estará disponible en una próxima versión"
                            )
                        }
                        className={[
                            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                            config.token_requiere_clave_acceso
                                ? "bg-sky-500"
                                : "bg-slate-300",
                            "cursor-not-allowed opacity-50",
                        ].join(" ")}
                    >
                        <span
                            className={[
                                "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
                                config.token_requiere_clave_acceso
                                    ? "translate-x-[1.375rem]"
                                    : "translate-x-0.5",
                            ].join(" ")}
                        />
                    </button>
                </div>
            </section>
        </div>
    );
};