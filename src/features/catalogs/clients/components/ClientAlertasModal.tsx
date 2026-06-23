import { Bell, BellOff, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

import { clientAlertasService } from "../services/clientAlertasService";
import { notify } from "@/stores/notificationStore";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { queryKeys } from "@/lib/query-keys";
import { SaveButton } from "@/components/shared/SaveButton";
import type { AlertaPoi, UpsertAlertaPoiPayload } from "@/features/catalogs/pois/types/poi-alertas.types";
import type { ClientItem } from "../types/client.types";
import { Field } from "@/components/shared/form-helpers";

interface ClientAlertasModalProps {
    // null = cerrado | ClientItem = abierto configurando alertas de ese cliente
    client: ClientItem | null;
    onClose: () => void;
}

interface AlertasForm {
    in_out: 0 | 1;
    permanencia: 0 | 1;
    tipo_permanencia: 1 | 2 | null;
    minutos_permanencia: string;
    vel_max: 0 | 1;
    vel_max_permitida: string;
    alcance: 1 | 2;
}

const FORM_DEFAULTS: AlertasForm = {
    in_out: 0,
    permanencia: 0,
    tipo_permanencia: null,
    minutos_permanencia: "",
    vel_max: 0,
    vel_max_permitida: "",
    alcance: 2,
};

const alertaToForm = (alerta: AlertaPoi): AlertasForm => ({
    in_out: alerta.in_out,
    permanencia: alerta.permanencia,
    tipo_permanencia: alerta.tipo_permanencia,
    minutos_permanencia: alerta.minutos_permanencia?.toString() ?? "",
    vel_max: alerta.vel_max,
    vel_max_permitida: alerta.vel_max_permitida?.toString() ?? "",
    alcance: alerta.alcance,
});

export const ClientAlertasModal = ({ client, onClose }: ClientAlertasModalProps) => {
    const queryClient = useQueryClient();
    const { idEmpresa } = useEmpresaActiva();

    const [form, setForm] = useState<AlertasForm>(FORM_DEFAULTS);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // carga la alerta actual del cliente
    const {
        data: alerta,
        isLoading: cargando,
        error: errorCarga,
    } = useQuery<AlertaPoi>({
        queryKey: queryKeys.catalogs.clientAlerta(client?.id_cliente ?? 0, idEmpresa),
        queryFn: () => clientAlertasService.getAlerta(client!.id_cliente, idEmpresa),
        enabled: !!client && !!idEmpresa,
        // No reintentar si es CLIENT_HAS_NO_POI — ese error es intencional
        retry: (_, err: unknown) => {
            if (err instanceof Error && err.message.includes("CLIENT_HAS_NO_POI")) return false;
            return true;
        },
    });

    // Sincronizar form cuando carga la alerta
    useEffect(() => {
        if (alerta) setForm(alertaToForm(alerta));
        else setForm(FORM_DEFAULTS);
    }, [alerta]);

    // Mutation — guardar alerta
    const {
        mutate: guardar,
        isPending: guardando,
        isSuccess: guardadoOk,
    } = useMutation({
        mutationFn: (payload: UpsertAlertaPoiPayload) =>
            clientAlertasService.upsertAlerta(client!.id_cliente, payload, idEmpresa),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.catalogs.clientAlerta(client!.id_cliente, idEmpresa),
            });
            setTimeout(() => onClose(), 1600);
        },
        onError: (err: unknown) => {
            const asFieldError = err as unknown as { fields?: Record<string, string[]> };
            if (asFieldError?.fields) {
                const raw = asFieldError.fields;
                setFieldErrors(Object.fromEntries(
                    Object.entries(raw).map(([k, msgs]) => [k, msgs[0]])
                ));
            } else {
                notify.error("No se pudieron guardar las alertas");
            }
        },
    });

    // Mutation — desactivar alerta
    const { mutate: desactivar, isPending: desactivando } = useMutation({
        mutationFn: () =>
            clientAlertasService.desactivarAlerta(client!.id_cliente, idEmpresa),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.catalogs.clientAlerta(client!.id_cliente, idEmpresa),
            });
            notify.success("Alertas desactivadas");
            onClose();
        },
        onError: () => notify.error("No se pudieron desactivar las alertas"),
    });

    const handleToggle = (field: keyof AlertasForm, value: 0 | 1) => {
        setFieldErrors({});
        setForm((prev) => {
            const next = { ...prev, [field]: value };
            if (field === "permanencia" && value === 0) {
                next.tipo_permanencia = null;
                next.minutos_permanencia = "";
            }
            if (field === "vel_max" && value === 0) {
                next.vel_max_permitida = "";
            }
            return next;
        });
    };

    const handleSubmit = () => {
        setFieldErrors({});
        const errors: Record<string, string> = {};
        if (form.permanencia === 1) {
            if (!form.tipo_permanencia)
                errors.tipo_permanencia = "Selecciona el tipo de permanencia";
            if (!form.minutos_permanencia || Number(form.minutos_permanencia) <= 0)
                errors.minutos_permanencia = "Ingresa los minutos (mayor a 0)";
        }
        if (form.vel_max === 1) {
            if (!form.vel_max_permitida || Number(form.vel_max_permitida) <= 0)
                errors.vel_max_permitida = "Ingresa la velocidad máxima (mayor a 0)";
        }
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        guardar({
            in_out: form.in_out,
            permanencia: form.permanencia,
            vel_max: form.vel_max,
            alcance: form.alcance,
            tipo_permanencia: form.permanencia === 1 ? form.tipo_permanencia : null,
            minutos_permanencia: form.permanencia === 1 ? Number(form.minutos_permanencia) : null,
            vel_max_permitida: form.vel_max === 1 ? Number(form.vel_max_permitida) : null,
        });
    };

    // El error CLIENT_HAS_NO_POI es especial — no es un error de red,
    // es que el cliente no tiene ubicación aún.
    const sinPoi = errorCarga instanceof Error &&
        errorCarga.message.includes("CLIENT_HAS_NO_POI");

    const tieneAlertasActivas = alerta && (alerta.in_out || alerta.permanencia || alerta.vel_max);
    const bloqueado = guardando || desactivando;

    return (
        <Dialog open={!!client} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-slate-500" />
                        Alertas de geocerca
                    </DialogTitle>
                    <DialogDescription>
                        {client?.nombre} — configura las notificaciones para este cliente
                    </DialogDescription>
                </DialogHeader>

                {/* Cargando */}
                {cargando && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                )}

                {/* Cliente sin ubicación configurada */}
                {sinPoi && !cargando && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <p className="font-medium">Sin ubicación configurada</p>
                                <p className="mt-1 text-amber-700">
                                    Para activar alertas, primero agrega una ubicación
                                    geográfica al cliente desde el botón Editar.
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}

                {/* Error de carga genérico */}
                {errorCarga && !cargando && !sinPoi && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        No se pudo cargar la configuración. Intenta de nuevo.
                    </div>
                )}

                {/* Formulario — igual que PoiAlertasModal */}
                {!cargando && !errorCarga && (
                    <div className="space-y-5 py-2">

                        <ToggleRow
                            label="Entrada / Salida"
                            description="Notificar cuando una unidad entra o sale del área del cliente"
                            active={form.in_out === 1}
                            onChange={(v) => handleToggle("in_out", v ? 1 : 0)}
                            disabled={bloqueado}
                        />

                        <div className="border-t border-slate-100" />

                        <ToggleRow
                            label="Permanencia"
                            description="Notificar si la unidad excede o no cumple el tiempo dentro del área"
                            active={form.permanencia === 1}
                            onChange={(v) => handleToggle("permanencia", v ? 1 : 0)}
                            disabled={bloqueado}
                        />

                        {form.permanencia === 1 && (
                            <div className="ml-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <Field label="Tipo de alerta">
                                    <div className="flex gap-3">
                                        <RadioChip
                                            id="tipo-max"
                                            label="Excede tiempo máximo"
                                            checked={form.tipo_permanencia === 1}
                                            onChange={() => setForm((p) => ({ ...p, tipo_permanencia: 1 }))}
                                            disabled={bloqueado}
                                        />
                                        <RadioChip
                                            id="tipo-min"
                                            label="No cumple tiempo mínimo"
                                            checked={form.tipo_permanencia === 2}
                                            onChange={() => setForm((p) => ({ ...p, tipo_permanencia: 2 }))}
                                            disabled={bloqueado}
                                        />
                                    </div>
                                    {fieldErrors.tipo_permanencia && (
                                        <FieldError msg={fieldErrors.tipo_permanencia} />
                                    )}
                                </Field>

                                <Field label="Minutos umbral">
                                    <input
                                        id="minutos"
                                        type="number"
                                        min={1}
                                        placeholder="Ej. 30"
                                        value={form.minutos_permanencia}
                                        onChange={(e) => setForm((p) => ({ ...p, minutos_permanencia: e.target.value }))}
                                        disabled={bloqueado}
                                        className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400 disabled:opacity-50"
                                    />
                                    {fieldErrors.minutos_permanencia && (
                                        <FieldError msg={fieldErrors.minutos_permanencia} />
                                    )}
                                </Field>
                            </div>
                        )}

                        <div className="border-t border-slate-100" />

                        <ToggleRow
                            label="Velocidad máxima"
                            description="Notificar si una unidad supera el límite de velocidad en el área del cliente"
                            active={form.vel_max === 1}
                            onChange={(v) => handleToggle("vel_max", v ? 1 : 0)}
                            disabled={bloqueado}
                        />

                        {form.vel_max === 1 && (
                            <div className="ml-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <Field label="Velocidad límite (km/h)">
                                    <input
                                        id="vel-max"
                                        type="number"
                                        min={1}
                                        placeholder="Ej. 40"
                                        value={form.vel_max_permitida}
                                        onChange={(e) => setForm((p) => ({ ...p, vel_max_permitida: e.target.value }))}
                                        disabled={bloqueado}
                                        className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400 disabled:opacity-50"
                                    />
                                    {fieldErrors.vel_max_permitida && (
                                        <FieldError msg={fieldErrors.vel_max_permitida} />
                                    )}
                                </Field>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                {!cargando && !errorCarga && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                        <div>
                            {tieneAlertasActivas ? (
                                <button
                                    type="button"
                                    onClick={() => desactivar()}
                                    disabled={bloqueado}
                                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 disabled:opacity-50"
                                >
                                    <BellOff className="h-4 w-4" />
                                    Desactivar alertas
                                </button>
                            ) : (
                                <span className="text-xs text-slate-400">Sin alertas activas</span>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={bloqueado}
                                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <SaveButton
                                onClick={handleSubmit}
                                isSaving={guardando}
                                isSaved={guardadoOk}
                                disabled={desactivando}
                                showSavedFeedback={true}
                            />
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

// Sub-componentes

const ToggleRow = ({
    label, description, active, onChange, disabled,
}: {
    label: string; description: string; active: boolean;
    onChange: (v: boolean) => void; disabled?: boolean;
}) => (
    <button
        type="button"
        onClick={() => !disabled && onChange(!active)}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-4 text-left disabled:opacity-50"
        aria-pressed={active}
    >
        <div>
            <p className="text-sm font-medium text-slate-800">{label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
        <div className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${active ? "bg-blue-600" : "bg-slate-200"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : "translate-x-0.5"}`} />
        </div>
    </button>
);

const RadioChip = ({
    id, label, checked, onChange, disabled,
}: {
    id: string; label: string; checked: boolean;
    onChange: () => void; disabled?: boolean;
}) => (
    <label
        htmlFor={id}
        className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${checked ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-white"
            } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
        <input id={id} type="radio" checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
        {label}
    </label>
);

const FieldError = ({ msg }: { msg: string }) => (
    <p role="alert" className="mt-1 text-xs text-red-500">{msg}</p>
);