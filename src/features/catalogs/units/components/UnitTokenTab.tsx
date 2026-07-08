import { useState, useEffect } from "react";
import { Copy, RefreshCw, Check, Link2Off, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unitService } from "../services/unitService";
import { notify } from "@/stores/notificationStore";

interface UnitTokenTabProps {
    idUnidad: number;
    idEmpresa: number | null;
    canEdit?: boolean;
}

const ToggleRow = ({ label, description, checked, onChange, disabled = false }: any) => (
    <div className="flex items-center justify-between gap-4 py-2.5">
        <div>
            <p className="text-sm font-medium text-slate-700">{label}</p>
            {description && <p className="text-xs text-slate-400">{description}</p>}
        </div>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={[
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out",
                checked ? "bg-sky-500" : "bg-slate-300",
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            ].join(" ")}
        >
            <span
                className={[
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
                    checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
                ].join(" ")}
            />
        </button>
    </div>
);

const expirationOptions = [
    { value: "1", label: "1 hora" },
    { value: "2", label: "2 horas" },
    { value: "4", label: "4 horas" },
    { value: "8", label: "8 horas" },
    { value: "12", label: "12 horas" },
    { value: "24", label: "24 horas" },
    { value: "permanent", label: "Permanente" },
    { value: "custom", label: "Personalizado" },
];

export const UnitTokenTab = ({ idUnidad, idEmpresa, canEdit = false }: UnitTokenTabProps) => {
    const queryClient = useQueryClient();
    const [copied, setCopied] = useState(false);
    
    const [expirationMode, setExpirationMode] = useState<string>("permanent");
    const [customHours, setCustomHours] = useState<string>("0");
    const [customMinutes, setCustomMinutes] = useState<string>("30");
    
    const [timeLeftStr, setTimeLeftStr] = useState<string | null>(null);

    const queryKey = ["unit-token", idUnidad, idEmpresa];

    const { data: token, isLoading } = useQuery({
        queryKey,
        queryFn: () => unitService.getTokenConfig(idUnidad, idEmpresa),
        enabled: idUnidad > 0,
    });

    const trackingUrl = token?.token
        ? `${window.location.origin}/track/unit/${token.token}`
        : null;

    useEffect(() => {
        if (!token?.fecha_expiracion) {
            setTimeLeftStr(null);
            return;
        }

        const targetDate = new Date(token.fecha_expiracion).getTime();

        const updateTimer = () => {
            const now = new Date().getTime();
            const difference = targetDate - now;

            if (difference <= 0) {
                setTimeLeftStr("Expirado");
                return false;
            }

            const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((difference % (1000 * 60)) / 1000);
            
            setTimeLeftStr(`${h}h ${m}m ${s}s`);
            return true;
        };

        if (updateTimer()) {
            const interval = setInterval(() => {
                if (!updateTimer()) clearInterval(interval);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [token?.fecha_expiracion]);

    const regenerate = useMutation({
        mutationFn: () => {
            let minutos: number | null = null;
            
            if (expirationMode !== "permanent" && expirationMode !== "custom") {
                minutos = parseInt(expirationMode) * 60;
            } else if (expirationMode === "custom") {
                minutos = (parseInt(customHours) || 0) * 60 + (parseInt(customMinutes) || 0);
            }

            return unitService.regenerateToken(idUnidad, idEmpresa, { 
                minutos_expiracion: minutos 
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            notify.success("Enlace de rastreo generado");
        },
        onError: (e) =>
            notify.error(e instanceof Error ? e.message : "No se pudo generar el enlace"),
    });

    const revoke = useMutation({
        mutationFn: () => unitService.revokeToken(idUnidad, idEmpresa),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            notify.success("Enlace de rastreo revocado");
        },
        onError: (e) =>
            notify.error(e instanceof Error ? e.message : "No se pudo revocar el enlace"),
    });

    const handleCopy = async () => {
        if (!trackingUrl) return;
        try {
            await navigator.clipboard.writeText(trackingUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            notify.error("No se pudo copiar el enlace");
        }
    };

    if (isLoading || !token) {
        return <div className="py-8 text-center text-sm text-slate-400">Cargando configuración…</div>;
    }

    const tieneToken = Boolean(token.token);
    const estaExpirado = timeLeftStr === "Expirado";

    return (
        <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 p-4">
                <div className="flex justify-between mb-2">
                    <p className="text-sm font-medium text-slate-700">Enlace de rastreo</p>
                    {tieneToken && token.fecha_expiracion && (
                        <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md ${estaExpirado ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            {estaExpirado ? 'Token expirado' : `Expira en: ${timeLeftStr}`}
                        </div>
                    )}
                    {tieneToken && !token.fecha_expiracion && (
                        <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600">
                            Token Permanente
                        </div>
                    )}
                </div>
                
                <p className="mb-3 text-xs text-slate-400">
                    Comparte este enlace para que alguien vea la ubicación de la unidad sin necesidad de cuenta.
                </p>

                {trackingUrl ? (
                    <div className="flex items-center gap-2">
                        <input
                            readOnly
                            value={trackingUrl}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${estaExpirado ? 'bg-red-50/50 border-red-200 text-red-400 line-through' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                        />
                        <button
                            type="button"
                            onClick={handleCopy}
                            disabled={estaExpirado}
                            className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                        >
                            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>
                ) : (
                    <p className="text-sm text-slate-400">Aún no se ha generado un enlace para esta unidad.</p>
                )}

                {canEdit && (
                    <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3 border border-slate-100">
                        <div>
                            <label className="text-xs font-medium text-slate-600 block mb-2">
                                Vigencia del nuevo enlace
                            </label>
                            
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-2">
                                {expirationOptions.map((opt) => (
                                    <label
                                        key={opt.value}
                                        className={`flex cursor-pointer items-center justify-center rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                                            expirationMode === opt.value
                                                ? "border-sky-500 bg-sky-50 text-sky-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="expirationMode"
                                            value={opt.value}
                                            checked={expirationMode === opt.value}
                                            onChange={(e) => setExpirationMode(e.target.value)}
                                            className="sr-only"
                                        />
                                        {opt.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {expirationMode === "custom" && (
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase font-semibold text-slate-400">Horas</label>
                                    <input 
                                        type="number" min="0" 
                                        value={customHours} onChange={(e) => setCustomHours(e.target.value)}
                                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase font-semibold text-slate-400">Minutos</label>
                                    <input 
                                        type="number" min="0" max="59"
                                        value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)}
                                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => regenerate.mutate()}
                                disabled={
                                    regenerate.isPending || 
                                    (expirationMode === "custom" && ((parseInt(customHours) || 0) + (parseInt(customMinutes) || 0) <= 0))
                                }
                                className="flex items-center gap-2 rounded-lg bg-sky-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50 w-full justify-center sm:w-auto"
                            >
                                <RefreshCw className={`h-4 w-4 ${regenerate.isPending ? "animate-spin" : ""}`} />
                                {tieneToken && !estaExpirado ? "Regenerar enlace" : "Generar enlace"}
                            </button>

                            {tieneToken && !estaExpirado && (
                                <button
                                    type="button"
                                    onClick={() => revoke.mutate()}
                                    disabled={revoke.isPending}
                                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50 w-full justify-center sm:w-auto bg-white"
                                >
                                    <Link2Off className="h-4 w-4" />
                                    Revocar
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </section>

            <section className="rounded-xl border border-slate-200 p-4">
                <p className="mb-1 text-sm font-medium text-slate-700">Seguridad del enlace</p>
                <ToggleRow
                    label="Requiere clave de acceso"
                    description="Pide una clave de 6 dígitos al abrir el enlace (próximamente)."
                    checked={token.token_requiere_clave_acceso}
                    onChange={() => notify.info("La clave de acceso estará disponible en una próxima versión")}
                    disabled
                />
            </section>
        </div>
    );
};