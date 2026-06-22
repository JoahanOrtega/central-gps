import { useState, useEffect, useMemo } from "react";
import { CalendarRange, Plus, Trash2, Moon } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useNotificationStore } from "@/stores/notificationStore";
import { queryKeys } from "@/lib/query-keys";
import { ApiError } from "@/lib/api";
import { SaveButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { itineraryRoleService } from "../services/itineraryGroupService";
import { itineraryService } from "../../services/itineraryService";
import type { ItineraryRole, DiaRol } from "../types/itinerary-group.types";

interface RoleFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role?: ItineraryRole | null;
    onSuccess: () => void;
}

interface DiaFormRow {
    dia_rol: number;
    orden: number;
    es_descanso: boolean;
    id_itinerario: number | null;
}

const emptyDia = (dia_rol: number): DiaFormRow => ({
    dia_rol,
    orden: 1,
    es_descanso: false,
    id_itinerario: null,
});

export const RoleFormModal = ({
    open, onOpenChange, role, onSuccess,
}: RoleFormModalProps) => {
    const { idEmpresa } = useEmpresaActiva();
    const notify = useNotificationStore((s) => s.addNotification);

    const [clave, setClave] = useState("");
    const [nombre, setNombre] = useState("");
    const [fechaInicio, setFechaInicio] = useState("");
    const [diasDuracion, setDiasDuracion] = useState(5);
    const [observaciones, setObservaciones] = useState("");
    const [dias, setDias] = useState<DiaFormRow[]>([]);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const isEditing = !!role;

    // Cargar itinerarios disponibles para los selects
    const { data: itinerarioGroups = [] } = useQuery({
        queryKey: queryKeys.operation.itineraries(idEmpresa, ""),
        queryFn: () => itineraryService.listGrouped(idEmpresa, ""),
        enabled: !!idEmpresa && open,
    });

    const itinerarioOptions = useMemo(
        () => itinerarioGroups.flatMap((g) =>
            g.itinerarios.map((i) => ({
                value: i.id_itinerario,
                label: `Turno ${i.turno} — ${g.nombre_ruta} (${i.hora_inicio ?? "--"}–${i.hora_fin ?? "--"})`,
            }))
        ),
        [itinerarioGroups],
    );

    // Cargar detalle del rol para edición
    const { data: roleDetail } = useQuery({
        queryKey: queryKeys.operation.itineraryRoleDetail(role?.id_rol_itinerarios!, idEmpresa),
        queryFn: () => itineraryRoleService.getRoleById(role!.id_rol_itinerarios, idEmpresa),
        enabled: !!role && open,
    });

    // Poblar formulario
    useEffect(() => {
        if (!open) return;
        if (role && roleDetail) {
            setClave(roleDetail.clave ?? "");
            setNombre(roleDetail.nombre ?? "");
            setFechaInicio(roleDetail.fecha_inicio_rol ?? "");
            setDiasDuracion(roleDetail.dias_duracion ?? 5);
            setObservaciones(roleDetail.observaciones ?? "");
            setDias(
                (roleDetail.dias ?? []).map((d: DiaRol) => ({
                    dia_rol: d.dia_rol,
                    orden: d.orden,
                    es_descanso: d.es_descanso,
                    id_itinerario: d.id_itinerario,
                }))
            );
        } else if (!role) {
            setClave("");
            setNombre("");
            setFechaInicio("");
            setDiasDuracion(5);
            setObservaciones("");
            setDias(Array.from({ length: 5 }, (_, i) => emptyDia(i + 1)));
        }
        setFieldErrors({});
    }, [open, role, roleDetail]);

    // Sincronizar el número de filas cuando cambia diasDuracion
    const handleDiasDuracionChange = (n: number) => {
        setDiasDuracion(n);
        setDias((prev) => {
            if (n > prev.length) {
                return [
                    ...prev,
                    ...Array.from({ length: n - prev.length }, (_, i) =>
                        emptyDia(prev.length + i + 1)
                    ),
                ];
            }
            return prev.slice(0, n);
        });
    };

    const updateDia = (idx: number, patch: Partial<DiaFormRow>) => {
        setDias((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...patch };
            return next;
        });
    };

    const mutation = useMutation({
        mutationFn: () => {
            const payload = {
                clave: clave.trim() || null,
                nombre: nombre.trim(),
                fecha_inicio_rol: fechaInicio || null,
                dias_duracion: diasDuracion,
                observaciones: observaciones.trim() || null,
                dias: dias.map((d) => ({
                    dia_rol: d.dia_rol,
                    orden: d.orden,
                    es_descanso: d.es_descanso,
                    id_itinerario: d.es_descanso ? null : d.id_itinerario,
                })),
            };
            return isEditing
                ? itineraryRoleService.updateRole(role.id_rol_itinerarios, payload, idEmpresa)
                : itineraryRoleService.createRole(payload, idEmpresa);
        },
        onSuccess: () => {
            notify({
                type: "success",
                message: isEditing ? `Rol "${nombre}" actualizado` : `Rol "${nombre}" creado`,
            });
            onSuccess();
        },
        onError: (err) => {
            if (err instanceof ApiError && err.fieldErrors) {
                setFieldErrors(err.fieldErrors);
            } else {
                notify({
                    type: "error",
                    message: err instanceof Error ? err.message : "Error al guardar",
                });
            }
        },
    });

    const handleSubmit = () => {
        setFieldErrors({});
        if (!nombre.trim()) {
            setFieldErrors({ nombre: "El nombre es requerido" });
            return;
        }
        mutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarRange className="h-5 w-5 text-violet-600" />
                        {isEditing ? "Editar rol" : "Nuevo rol"}
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4 space-y-5">
                    {/* Metadatos del rol */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="role-nombre">Nombre del rol *</Label>
                            <Input
                                id="role-nombre"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="ej: Semana Laboral, Fin de Semana..."
                                maxLength={150}
                            />
                            {fieldErrors.nombre && (
                                <p className="text-xs text-red-500">{fieldErrors.nombre}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="role-clave">Clave (opcional)</Label>
                            <Input
                                id="role-clave"
                                value={clave}
                                onChange={(e) => setClave(e.target.value)}
                                placeholder="ej: ROL-A, ROL-MAT"
                                maxLength={50}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="role-duracion">Duración del ciclo (días)</Label>
                            <Input
                                id="role-duracion"
                                type="number"
                                min={1}
                                max={30}
                                value={diasDuracion}
                                onChange={(e) => handleDiasDuracionChange(Number(e.target.value) || 1)}
                            />
                            <p className="text-xs text-slate-400">
                                Número total de días incluyendo descansos
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="role-fecha">Fecha de inicio del ciclo</Label>
                            <Input
                                id="role-fecha"
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="role-obs">Observaciones</Label>
                        <textarea
                            id="role-obs"
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            rows={2}
                            maxLength={500}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 resize-none"
                        />
                    </div>

                    {/* Secuencia de días */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Secuencia de días</Label>
                            <p className="text-xs text-slate-400">{diasDuracion} día{diasDuracion !== 1 ? "s" : ""} en el ciclo</p>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            {/* Encabezado */}
                            <div className="grid grid-cols-[2.5rem_1fr_6rem] gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                <span className="text-center">#</span>
                                <span>Itinerario asignado</span>
                                <span className="text-center">Descanso</span>
                            </div>

                            {dias.map((dia, idx) => (
                                <div
                                    key={idx}
                                    className={[
                                        "grid grid-cols-[2.5rem_1fr_6rem] items-center gap-2 border-b border-slate-100 px-4 py-2 last:border-b-0",
                                        dia.es_descanso ? "bg-slate-50/80" : "bg-white",
                                    ].join(" ")}
                                >
                                    {/* Número de día */}
                                    <span className="text-center text-sm font-semibold text-slate-400">
                                        {dia.dia_rol}
                                    </span>

                                    {/* Select de itinerario o label de descanso */}
                                    {dia.es_descanso ? (
                                        <div className="flex items-center gap-1.5 text-sm text-slate-400">
                                            <Moon className="h-3.5 w-3.5" />
                                            <span>Día de descanso</span>
                                        </div>
                                    ) : (
                                        <select
                                            value={dia.id_itinerario ?? ""}
                                            onChange={(e) =>
                                                updateDia(idx, {
                                                    id_itinerario: Number(e.target.value) || null,
                                                })
                                            }
                                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                                        >
                                            <option value="">Sin asignar...</option>
                                            {itinerarioOptions.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Toggle descanso */}
                                    <div className="flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateDia(idx, {
                                                    es_descanso: !dia.es_descanso,
                                                    id_itinerario: dia.es_descanso ? null : null,
                                                })
                                            }
                                            className={[
                                                "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                                                dia.es_descanso
                                                    ? "border-violet-300 bg-violet-100 text-violet-600"
                                                    : "border-slate-200 text-slate-400 hover:border-violet-200 hover:bg-violet-50",
                                            ].join(" ")}
                                            title={dia.es_descanso ? "Marcar como día laboral" : "Marcar como descanso"}
                                        >
                                            <Moon className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={mutation.isPending}
                        >
                            Cancelar
                        </Button>
                        <SaveButton
                            onClick={handleSubmit}
                            isSaving={mutation.isPending}
                            label={isEditing ? "Guardar cambios" : "Crear rol"}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};