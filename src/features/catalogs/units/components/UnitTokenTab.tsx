import { useState } from "react";
import { Copy, RefreshCw, Check, Link2Off } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unitService } from "../services/unitService";
import { notify } from "@/stores/notificationStore";

interface UnitTokenTabProps {
    idUnidad: number;
    idEmpresa: number | null;
    // Sin permiso de edición, los controles se muestran deshabilitados (solo
    // lectura del enlace, sin generar ni revocar).
    canEdit?: boolean;
}

// Fila etiqueta + toggle, mismo estilo que el resto del sistema.
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

export const UnitTokenTab = ({
    idUnidad,
    idEmpresa,
    canEdit = false,
}: UnitTokenTabProps) => {
    const queryClient = useQueryClient();
    const [copied, setCopied] = useState(false);

    // Key con idEmpresa para aislar cache entre empresas (sudo_erp cambia de
    // empresa sin recargar; sin esto vería el token de la empresa anterior).
    const queryKey = ["unit-token", idUnidad, idEmpresa];

    const { data: token, isLoading } = useQuery({
        queryKey,
        queryFn: () => unitService.getTokenConfig(idUnidad, idEmpresa),
        enabled: idUnidad > 0,
    });

    // Enlace público de rastreo. El slug /track/unit/<token> es la ruta pública
    // que se construye en el Chunk 4 (vista pública de rastreo).
    const trackingUrl = token?.token
        ? `${window.location.origin}/track/unit/${token.token}`
        : null;

    const regenerate = useMutation({
        mutationFn: () => unitService.regenerateToken(idUnidad, idEmpresa),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            notify.success("Enlace de rastreo generado");
        },
        onError: (e) =>
            notify.error(
                e instanceof Error ? e.message : "No se pudo generar el enlace",
            ),
    });

    const revoke = useMutation({
        mutationFn: () => unitService.revokeToken(idUnidad, idEmpresa),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            notify.success("Enlace de rastreo revocado");
        },
        onError: (e) =>
            notify.error(
                e instanceof Error ? e.message : "No se pudo revocar el enlace",
            ),
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

    const tieneToken = Boolean(token.token);

    return (
        <div className="space-y-5">
            {/* Enlace de rastreo */}
            <section className="rounded-xl border border-slate-200 p-4">
                <p className="mb-2 text-sm font-medium text-slate-700">
                    Enlace de rastreo
                </p>
                <p className="mb-3 text-xs text-slate-400">
                    Comparte este enlace para que alguien vea la ubicación de la
                    unidad sin necesidad de cuenta.
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
                        Aún no se ha generado un enlace para esta unidad.
                    </p>
                )}

                {/* Acciones: generar/regenerar y revocar. Solo con permiso. */}
                {canEdit && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => regenerate.mutate()}
                            disabled={regenerate.isPending}
                            className="flex items-center gap-2 rounded-lg bg-sky-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${regenerate.isPending ? "animate-spin" : ""}`}
                            />
                            {tieneToken ? "Regenerar enlace" : "Generar enlace"}
                        </button>

                        {tieneToken && (
                            <button
                                type="button"
                                onClick={() => revoke.mutate()}
                                disabled={revoke.isPending}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                                <Link2Off className="h-4 w-4" />
                                Revocar
                            </button>
                        )}
                    </div>
                )}

                {tieneToken && canEdit && (
                    <p className="mt-2 text-xs text-slate-400">
                        Al regenerar o revocar, el enlace anterior dejará de
                        funcionar de inmediato.
                    </p>
                )}
            </section>

            {/* Opciones de acceso. La verificación de clave se implementa en una
                iteración posterior; el toggle deja la preferencia lista. */}
            <section className="rounded-xl border border-slate-200 p-4">
                <p className="mb-1 text-sm font-medium text-slate-700">
                    Seguridad del enlace
                </p>
                <ToggleRow
                    label="Requiere clave de acceso"
                    description="Pide una clave de 6 dígitos al abrir el enlace (próximamente)."
                    checked={token.token_requiere_clave_acceso}
                    onChange={() =>
                        notify.info(
                            "La clave de acceso estará disponible en una próxima versión",
                        )
                    }
                    disabled
                />
            </section>
        </div>
    );
};