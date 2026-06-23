import { UserRound, Phone, Truck, Pencil, Trash2 } from "lucide-react";
import { KebabMenu } from "@/components/shared";
import type { OperatorItem } from "../services/operator.types";

interface OperatorCardProps {
    operator: OperatorItem;
    canEdit?: boolean;
    canDelete?: boolean;
    onEdit?: (idOperador: number) => void;
    onDelete?: (operator: OperatorItem) => void;
    onAssign?: (operator: OperatorItem) => void;
}

export const OperatorCard = ({
    operator,
    canEdit = false,
    canDelete = false,
    onEdit,
    onDelete,
    onAssign,
}: OperatorCardProps) => {
    const menuItems = [
        canEdit && {
            id: "edit",
            label: "Editar",
            icon: Pencil,
            onClick: () => onEdit?.(operator.id_operador),
        },
        canEdit && {
            id: "assign",
            label: "Asignar unidad",
            icon: Truck,
            onClick: () => onAssign?.(operator),
        },
        canDelete && {
            id: "delete",
            label: "Eliminar",
            icon: Trash2,
            variant: "destructive" as const,
            onClick: () => onDelete?.(operator),
        },
    ].filter(Boolean) as React.ComponentProps<typeof KebabMenu>["items"];

    return (
        <article className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-2xl font-semibold text-slate-800">
                        {operator.nombre}
                    </h3>
                    {operator.clave && operator.clave !== "0" && (
                        <p className="mt-1 text-sm text-slate-500">Clave: {operator.clave}</p>
                    )}
                </div>

                <div className="flex shrink-0 items-start gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                        {operator.imagen ? (
                            <img
                                src={operator.imagen}
                                alt={`Foto de ${operator.nombre}`}
                                className="h-10 w-10 rounded-lg object-cover"
                            />
                        ) : (
                            <UserRound className="h-4 w-4 text-slate-500" />
                        )}
                    </div>

                    {menuItems.length > 0 && (
                        <KebabMenu items={menuItems} entityName={operator.nombre} />
                    )}
                </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-slate-700">
                <div className="flex items-start gap-1.5">
                    <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <div>
                        <p className="font-medium">Teléfono</p>
                        <p>{operator.telefono || "---"}</p>
                    </div>
                </div>
                {operator.licencia && (
                    <div>
                        <p className="font-medium">Licencia</p>
                        <p className="truncate">
                            {operator.licencia}
                            {operator.tipo_licencia ? ` (${operator.tipo_licencia})` : ""}
                        </p>
                    </div>
                )}

                {operator.id_unidad_operador ? (
                    <div className="flex items-start gap-1.5">
                        <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <div>
                            <p className="font-medium">Unidad</p>
                            <p className="text-slate-500">Asignada</p>
                        </div>
                    </div>
                ) : null}
            </div>
        </article>
    );
};