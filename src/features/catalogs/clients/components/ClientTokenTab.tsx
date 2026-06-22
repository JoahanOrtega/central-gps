import { useState } from "react";
import { Copy, RefreshCw, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientService } from "./clientService";
import type {
    ClientTokenConfig,
    ClientDashboardConfig,
} from "./client.types";
import { notify } from "@/stores/notificationStore";

interface ClientTokenTabProps {
    idCliente: number;
    idEmpresa: number | null;
}



// Fila con etiqueta + control toggle, al estilo del sistema (chip on/off).

const ToggleRow = ({
    label,
    description,
    checked,
    onChange,
    disabled = false,
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) => (
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

export const ClientTokenTab = ({ idCliente, idEmpresa }: ClientTokenTabProps) => {
    const queryClient = useQueryClient();
    const [copied, setCopied] = useState(false);

    const queryKey = ["client-token", idCliente, idEmpresa];

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: () => clientService.getTokenConfig(idCliente, idEmpresa),
        enabled: idCliente > 0,
    });

    const token = data?.token;

    // Enlace público de rastreo. Usa el origen actual; el slug /track/<token>
    // será la ruta pública que se construya en la entrega de la vista pública.
    const trackingUrl = token?.token
        ? `${window.location.origin}/track/${token.token}`
        : null;

    const regenerate = useMutation({
        mutationFn: () => clientService.regenerateToken(idCliente, idEmpresa),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            notify.success("Token de rastreo generado");
        },
        onError: (e) =>
            notify.error(e instanceof Error ? e.message : "No se pudo generar el token"),
    });

    const updateConfig = useMutation({
        mutationFn: (payload: Partial<ClientTokenConfig & ClientDashboardConfig>) =>
            clientService.updateTokenConfig(idCliente, payload, idEmpresa),
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
        onError: (e) =>
            notify.error(e instanceof Error ? e.message : "No se pudo guardar el cambio"),
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
        return (
            <div className="py-8 text-center text-sm text-slate-400">
                Cargando configuración…
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Activación del rastreo */}
            <section className="rounded-xl border border-slate-200 p-4">
                <ToggleRow
                    label="Acceso al rastreo público"
                    description="Permite ver la ubicación en vivo mediante un enlace."
                    checked={token.acceso_token_rastreo}
                    onChange={(v) => updateConfig.mutate({ acceso_token_rastreo: v })}
                />
            </section>

            {/* Token y enlace */}
            <section className="rounded-xl border border-slate-200 p-4">
                <p className="mb-2 text-sm font-medium text-slate-700">
                    Enlace de rastreo
                </p>
                {trackingUrl ? (
                    <div className="flex items-center gap-2">
                        <input
                            readOnly
                            value={trackingUrl}
                            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                        />
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 hover:bg-slate-200"
                            aria-label="Copiar enlace"
                        >
                            {copied ? (
                                <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                ) : (
                    <p className="text-sm text-slate-400">
                        Aún no se ha generado un token para este cliente.
                    </p>
                )}

                <button
                    type="button"
                    onClick={() => regenerate.mutate()}
                    disabled={regenerate.isPending}
                    className="mt-3 flex items-center gap-2 rounded-lg bg-sky-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
                >
                    <RefreshCw
                        className={`h-4 w-4 ${regenerate.isPending ? "animate-spin" : ""}`}
                    />
                    {token.token ? "Regenerar token" : "Generar token"}
                </button>
                {token.token && (
                    <p className="mt-2 text-xs text-slate-400">
                        Al regenerar, el enlace anterior dejará de funcionar.
                    </p>
                )}
            </section>

            {/* Opciones de acceso */}
            <section className="rounded-xl border border-slate-200 p-4">
                <p className="mb-1 text-sm font-medium text-slate-700">
                    Opciones de acceso
                </p>
                <ToggleRow
                    label="Requiere clave de acceso"
                    description="Pide una clave de 6 dígitos al abrir el enlace."
                    checked={token.token_requiere_clave_acceso}
                    onChange={(v) =>
                        updateConfig.mutate({ token_requiere_clave_acceso: v })
                    }
                />
                <ToggleRow
                    label="Acceso global"
                    description="Muestra todas las unidades, no solo la asignada."
                    checked={token.acceso_global}
                    onChange={(v) => updateConfig.mutate({ acceso_global: v })}
                />
                <ToggleRow
                    label="Ocultar itinerarios terminados"
                    checked={token.ocultar_itinerarios_terminados}
                    onChange={(v) =>
                        updateConfig.mutate({ ocultar_itinerarios_terminados: v })
                    }
                />
            </section>
        </div>
    );
};