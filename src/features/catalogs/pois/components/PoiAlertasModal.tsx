// Modal para configurar las alertas de geocerca de un POI.

import { useEffect, useState } from "react";
import { Bell, BellOff, AlertCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

import { poiAlertasService } from "../services/poiAlertasService";
import { notify } from "@/stores/notificationStore";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { queryKeys } from "@/lib/query-keys";
import { SaveButton } from "@/components/shared/SaveButton";
import type { AlertaPoi, UpsertAlertaPoiPayload } from "./poi.alertas.types";
import type { PoiItem } from "../types/poi.types";

// ── Props ─────────────────────────────────────────────────────────────────────
interface PoiAlertasModalProps {
    // null = cerrado | PoiItem = abierto configurando alertas de ese POI
    poi: PoiItem | null;
    onClose: () => void;
}

// ── Estado local del form ─────────────────────────────────────────────────────
// Refleja exactamente los campos de AlertaPoi que el usuario puede editar.
interface AlertasForm {
    in_out: 0 | 1;
    permanencia: 0 | 1;
    tipo_permanencia: 1 | 2 | null;
    minutos_permanencia: string;    // string para el input, se convierte a int al guardar
    vel_max: 0 | 1;
    vel_max_permitida: string;    // string para el input, se convierte a int al guardar
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

// Convierte la respuesta del backend al estado del form
const alertaToForm = (alerta: AlertaPoi): AlertasForm => ({
    in_out: alerta.in_out,
    permanencia: alerta.permanencia,
    tipo_permanencia: alerta.tipo_permanencia,
    minutos_permanencia: alerta.minutos_permanencia?.toString() ?? "",
    vel_max: alerta.vel_max,
    vel_max_permitida: alerta.vel_max_permitida?.toString() ?? "",
    alcance: alerta.alcance,
});

// ── Componente ────────────────────────────────────────────────────────────────
export const PoiAlertasModal = ({ poi, onClose }: PoiAlertasModalProps) => {
    const queryClient = useQueryClient();
    const { idEmpresa } = useEmpresaActiva();

    const [form, setForm] = useState<AlertasForm>(FORM_DEFAULTS);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // ── Query: cargar alerta actual ───────────────────────────────────────────
    const {
        data: alerta,
        isLoading: cargando,
        error: errorCarga,
    } = useQuery<AlertaPoi>({
        queryKey: queryKeys.pois.alerta(poi?.id_poi ?? 0, idEmpresa),
        queryFn: () => poiAlertasService.getAlerta(poi!.id_poi, idEmpresa),
        enabled: !!poi && !!idEmpresa,
    });

    // Sincronizar form cuando carga la alerta
    useEffect(() => {
        if (alerta) setForm(alertaToForm(alerta));
        else setForm(FORM_DEFAULTS);
    }, [alerta]);

    // ── Mutation: guardar alerta ──────────────────────────────────────────────
    const {
        mutate: guardar,
        isPending: guardando,
        isSuccess: guardadoOk,
    } = useMutation({
        mutationFn: (payload: UpsertAlertaPoiPayload) =>
            poiAlertasService.upsertAlerta(poi!.id_poi, payload, idEmpresa),
        onSuccess: () => {
            // Invalidar cache — la card actualiza su badge de alertas activas
            queryClient.invalidateQueries({
                queryKey: queryKeys.pois.alerta(poi!.id_poi, idEmpresa),
            });
            // El SaveButton muestra "Guardado ✓" por 1.5s.
            // El modal se cierra despues del feedback para que el usuario
            // vea la confirmacion antes de que desaparezca.
            setTimeout(() => onClose(), 1600);
        },
        onError: (err: unknown) => {
            // Errores de validacion por campo del backend
            if (
                err instanceof Error &&
                (err as unknown as { fields?: Record<string, string[]> }).fields
            ) {
                const raw = (err as unknown as { fields: Record<string, string[]> }).fields;
                const mapped: Record<string, string> = {};
                Object.entries(raw).forEach(([k, msgs]) => {
                    mapped[k] = msgs[0];
                });
                setFieldErrors(mapped);
            } else {
                notify.error("No se pudieron guardar las alertas");
            }
        },
    });

    // ── Mutation: desactivar alertas ──────────────────────────────────────────
    const { mutate: desactivar, isPending: desactivando } = useMutation({
        mutationFn: () =>
            poiAlertasService.desactivarAlerta(poi!.id_poi, idEmpresa),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.pois.alerta(poi!.id_poi, idEmpresa),
            });
            notify.success("Alertas desactivadas");
            onClose();
        },
        onError: () => notify.error("No se pudieron desactivar las alertas"),
    });

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleToggle = (field: keyof AlertasForm, value: 0 | 1) => {
        setFieldErrors({});
        setForm((prev) => {
            const next = { ...prev, [field]: value };
            // Limpiar campos dependientes al desactivar el toggle padre
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

        // Validacion frontend — espejo de los checks del backend
        const errors: Record<string, string> = {};
        if (form.permanencia === 1) {
            if (!form.tipo_permanencia)
                errors.tipo_permanencia = "Selecciona el tipo de permanencia";
            if (!form.minutos_permanencia || Number(form.minutos_permanencia) <= 0)
                errors.minutos_permanencia = "Ingresa los minutos (mayor a 0)";
        }
        if (form.vel_max === 1) {
            if (!form.vel_max_permitida || Number(form.vel_max_permitida) <= 0)
                errors.vel_max_permitida = "Ingresa la velocidad maxima (mayor a 0)";
        }
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        const payload: UpsertAlertaPoiPayload = {
            in_out: form.in_out,
            permanencia: form.permanencia,
            vel_max: form.vel_max,
            alcance: form.alcance,
            tipo_permanencia: form.permanencia === 1 ? form.tipo_permanencia : null,
            minutos_permanencia: form.permanencia === 1
                ? Number(form.minutos_permanencia) : null,
            vel_max_permitida: form.vel_max === 1
                ? Number(form.vel_max_permitida) : null,
        };

        guardar(payload);
    };

    const tieneAlertasActivas =
        alerta && (alerta.in_out || alerta.permanencia || alerta.vel_max);

    const bloqueado = guardando || desactivando;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Dialog open={!!poi} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-slate-500" />
                        Alertas de geocerca
                    </DialogTitle>
                    <DialogDescription>
                        {poi?.nombre} — configura las notificaciones para este POI
                    </DialogDescription>
                </DialogHeader>

                {/* ── Estado de carga ───────────────────────────────────────── */}
                {cargando && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                )}

                {/* ── Error de carga ────────────────────────────────────────── */}
                {errorCarga && !cargando && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        No se pudo cargar la configuracion. Intenta de nuevo.
                    </div>
                )}

                {/* ── Formulario ────────────────────────────────────────────── */}
                {!cargando && !errorCarga && (
                    <div className="space-y-5 py-2">

                        {/* ── Alerta entrada / salida ───────────────────────── */}
                        <ToggleRow
                            label="Entrada / Salida"
                            description="Notificar cuando una unidad entra o sale del POI"
                            active={form.in_out === 1}
                            onChange={(v) => handleToggle("in_out", v ? 1 : 0)}
                            disabled={bloqueado}
                        />

                        <div className="border-t border-slate-100" />

                        {/* ── Alerta permanencia ────────────────────────────── */}
                        <ToggleRow
                            label="Permanencia"
                            description="Notificar si la unidad excede o no cumple el tiempo dentro del POI"
                            active={form.permanencia === 1}
                            onChange={(v) => handleToggle("permanencia", v ? 1 : 0)}
                            disabled={bloqueado}
                        />

                        {/* Campos dependientes — solo visibles si permanencia=1 */}
                        {form.permanencia === 1 && (
                            <div className="ml-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                {/* Tipo de permanencia */}
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        Tipo de alerta
                                    </label>
                                    <div className="flex gap-3">
                                        <RadioOption
                                            id="tipo-max"
                                            label="Excede tiempo maximo"
                                            checked={form.tipo_permanencia === 1}
                                            onChange={() => setForm((p) => ({ ...p, tipo_permanencia: 1 }))}
                                            disabled={bloqueado}
                                        />
                                        <RadioOption
                                            id="tipo-min"
                                            label="No cumple tiempo minimo"
                                            checked={form.tipo_permanencia === 2}
                                            onChange={() => setForm((p) => ({ ...p, tipo_permanencia: 2 }))}
                                            disabled={bloqueado}
                                        />
                                    </div>
                                    {fieldErrors.tipo_permanencia && (
                                        <FieldError msg={fieldErrors.tipo_permanencia} />
                                    )}
                                </div>

                                {/* Minutos */}
                                <div>
                                    <label
                                        htmlFor="minutos"
                                        className="mb-1.5 block text-xs font-medium text-slate-600"
                                    >
                                        Minutos umbral
                                    </label>
                                    <input
                                        id="minutos"
                                        type="number"
                                        min={1}
                                        placeholder="Ej. 30"
                                        value={form.minutos_permanencia}
                                        onChange={(e) =>
                                            setForm((p) => ({
                                                ...p,
                                                minutos_permanencia: e.target.value,
                                            }))
                                        }
                                        disabled={bloqueado}
                                        className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400 disabled:opacity-50"
                                    />
                                    {fieldErrors.minutos_permanencia && (
                                        <FieldError msg={fieldErrors.minutos_permanencia} />
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="border-t border-slate-100" />

                        {/* ── Alerta velocidad maxima ───────────────────────── */}
                        <ToggleRow
                            label="Velocidad maxima"
                            description="Notificar si una unidad supera el limite de velocidad dentro del POI"
                            active={form.vel_max === 1}
                            onChange={(v) => handleToggle("vel_max", v ? 1 : 0)}
                            disabled={bloqueado}
                        />

                        {/* Campo dependiente — solo visible si vel_max=1 */}
                        {form.vel_max === 1 && (
                            <div className="ml-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <label
                                    htmlFor="vel-max"
                                    className="mb-1.5 block text-xs font-medium text-slate-600"
                                >
                                    Velocidad limite (km/h)
                                </label>
                                <input
                                    id="vel-max"
                                    type="number"
                                    min={1}
                                    placeholder="Ej. 40"
                                    value={form.vel_max_permitida}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            vel_max_permitida: e.target.value,
                                        }))
                                    }
                                    disabled={bloqueado}
                                    className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400 disabled:opacity-50"
                                />
                                {fieldErrors.vel_max_permitida && (
                                    <FieldError msg={fieldErrors.vel_max_permitida} />
                                )}
                            </div>
                        )}

                    </div>
                )}

                {/* ── Footer ────────────────────────────────────────────────── */}
                {!cargando && !errorCarga && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                        {/* Desactivar todas las alertas — solo si hay alguna activa */}
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
                                <span className="text-xs text-slate-400">
                                    Sin alertas activas
                                </span>
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
                            {/* SaveButton gestiona idle → saving → saved ✓
                                El usuario ve confirmacion visual antes de
                                que el modal se cierre (1.5s de feedback). */}
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

// ── Sub-componentes ───────────────────────────────────────────────────────────

interface ToggleRowProps {
    label: string;
    description: string;
    active: boolean;
    onChange: (active: boolean) => void;
    disabled?: boolean;
}

// Fila clickeable completa — area de click generosa (Fitt's law)
const ToggleRow = ({ label, description, active, onChange, disabled }: ToggleRowProps) => (
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
        {/* Toggle visual */}
        <div
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${active ? "bg-blue-600" : "bg-slate-200"
                }`}
        >
            <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : "translate-x-0.5"
                    }`}
            />
        </div>
    </button>
);

interface RadioOptionProps {
    id: string;
    label: string;
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
}

const RadioOption = ({ id, label, checked, onChange, disabled }: RadioOptionProps) => (
    <label
        htmlFor={id}
        className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${checked
            ? "border-blue-300 bg-blue-50 text-blue-700"
            : "border-slate-200 text-slate-600 hover:bg-white"
            } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
        <input
            id={id}
            type="radio"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only"
        />
        {label}
    </label>
);

const FieldError = ({ msg }: { msg: string }) => (
    <p role="alert" className="mt-1 text-xs text-red-500">
        {msg}
    </p>
);