import type { UnitItem } from "../types/unit.types";
import { BusFront, FileImage, Pencil, Trash2 } from "lucide-react";
import { KebabMenu } from "@/components/shared";

interface UnitCardProps {
  unit: UnitItem;
  canEdit?:   boolean;
  canDelete?: boolean;
  onEdit?:    (idUnidad: number) => void;
  onDelete?:  (unit: UnitItem) => void;
}

export const UnitCard = ({
  unit,
  canEdit   = false,
  canDelete = false,
  onEdit,
  onDelete,
}: UnitCardProps) => {
  const statusLabel   = "Apagada";
  const operatorLabel = unit.id_operador ? `Operador ${unit.id_operador}` : "--- --- ---";

  const menuItems = [
    canEdit && {
      id: "edit",
      label: "Editar",
      icon: Pencil,
      onClick: () => onEdit?.(unit.id),
    },
    canDelete && {
      id: "delete",
      label: "Eliminar",
      icon: Trash2,
      variant: "destructive" as const,
      onClick: () => onDelete?.(unit),
    },
  ].filter(Boolean) as React.ComponentProps<typeof KebabMenu>["items"];

  return (
    <article className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-3xl font-semibold text-slate-800">{unit.numero}</h3>
          <p className="mt-1 text-lg text-slate-700">{unit.marca} {unit.modelo}</p>
          <p className="mt-2 text-sm text-slate-500">{statusLabel}</p>
        </div>

        {menuItems.length > 0 && (
          <KebabMenu items={menuItems} entityName={`unidad ${unit.numero}`} />
        )}
      </div>

      <div className="mt-6 grid grid-cols-[120px_1fr_1fr] gap-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-100 bg-slate-50 p-4">
          <FileImage className="h-14 w-14 text-slate-400" />
          <p className="mt-4 text-sm text-slate-500">Operador</p>
          <p className="mt-1 text-sm text-slate-700">{operatorLabel}</p>
        </div>

        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <BusFront className="h-4 w-4 text-slate-400" />
            <span className="font-medium">Tipo</span>
          </div>
          <p>{unit.tipo}</p>
          <p className="font-medium">IMEI AVL</p>
          <p>{unit.imei}</p>
        </div>

        <div className="space-y-3 text-sm text-slate-700">
          <p className="font-medium">Matrícula</p>
          <p>{unit.matricula}</p>
          <p className="font-medium">Chip</p>
          <p>{unit.chip}</p>
          <p className="font-medium">Año</p>
          <p>{unit.anio}</p>
        </div>
      </div>
    </article>
  );
};