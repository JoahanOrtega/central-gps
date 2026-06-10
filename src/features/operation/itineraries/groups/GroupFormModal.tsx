import { useState, useEffect } from "react";
import { FolderOpen } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useNotificationStore } from "@/stores/notificationStore";
import { ApiError } from "@/lib/api";
import { SaveButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { itineraryGroupService } from "./itineraryGroupService";
import type { ItineraryGroup } from "./itinerary-group.types";

interface GroupFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    group?: ItineraryGroup | null;  // null = crear
    onSuccess: () => void;
}

export const GroupFormModal = ({
    open, onOpenChange, group, onSuccess,
}: GroupFormModalProps) => {
    const { idEmpresa } = useEmpresaActiva();
    const notify = useNotificationStore((s) => s.addNotification);

    const [nombre, setNombre] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const isEditing = !!group;

    useEffect(() => {
        if (open) {
            setNombre(group?.nombre ?? "");
            setObservaciones(group?.observaciones ?? "");
            setFieldErrors({});
        }
    }, [open, group]);

    const mutation = useMutation({
        mutationFn: () =>
            isEditing
                ? itineraryGroupService.updateGroup(
                    group.id_grupo_itinerarios,
                    { nombre: nombre.trim(), observaciones: observaciones.trim() || null },
                    idEmpresa,
                )
                : itineraryGroupService.createGroup(
                    { nombre: nombre.trim(), observaciones: observaciones.trim() || null },
                    idEmpresa,
                ),
        onSuccess: () => {
            notify({
                type: "success",
                message: isEditing
                    ? `Grupo "${nombre}" actualizado`
                    : `Grupo "${nombre}" creado`,
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
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-sky-600" />
                        {isEditing ? "Editar grupo" : "Nuevo grupo"}
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="group-nombre">Nombre del grupo *</Label>
                        <Input
                            id="group-nombre"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="ej: Matutinos, Vespertinos, Especiales..."
                            maxLength={150}
                            autoFocus
                        />
                        {fieldErrors.nombre && (
                            <p className="text-xs text-red-500">{fieldErrors.nombre}</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="group-obs">Observaciones</Label>
                        <textarea
                            id="group-obs"
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            placeholder="Descripción opcional del grupo..."
                            rows={3}
                            maxLength={500}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 resize-none"
                        />
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
                            label={isEditing ? "Guardar cambios" : "Crear grupo"}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};