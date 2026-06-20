import type { UnitItem } from "../types/unit.types";
import { BusFront, FileImage, Pencil, Trash2 } from "lucide-react";
import { KebabMenu } from "@/components/shared";
import { resolveUnitImageSrc } from "../lib/unit-image";

interface UnitCardProps {
  unit: UnitItem;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (idUnidad: number) => void;
  onDelete?: (unit: UnitItem) => void;
}

export const UnitCard = ({
  unit,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
}: UnitCardProps) => {
  const statusLabel = "Apagada";
  const operatorLabel = unit.id_operador ? `Operador ${unit.id_operador}` : "--- --- ---";
  const imageSrc = resolveUnitImageSrc(unit.imagen);

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

      <div className="mt-5 flex flex-col gap-6 sm:flex-row">
        {/* Foto a la izquierda con su propio espacio. Placeholder si no hay. */}
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
          {imageSrc ? (
            <img src={imageSrc} alt={`Unidad ${unit.numero}`} className="h-full w-full object-cover" />
          ) : (
            <FileImage className="h-10 w-10 text-slate-300" />
          )}
        </div>

        <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 text-sm text-slate-700">
          <div>
            <p className="flex items-center gap-1.5 font-medium">
              <BusFront className="h-4 w-4 text-slate-400" />
              Tipo
            </p>
            <p className="mt-0.5">{unit.tipo}</p>
          </div>
          <div>
            <p className="font-medium">Matrícula</p>
            <p className="mt-0.5">{unit.matricula}</p>
          </div>
          <div>
            <p className="font-medium">IMEI AVL</p>
            <p className="mt-0.5">{unit.imei}</p>
          </div>
          <div>
            <p className="font-medium">Chip</p>
            <p className="mt-0.5">{unit.chip}</p>
          </div>
          <div>
            <p className="font-medium">Año</p>
            <p className="mt-0.5">{unit.anio}</p>
          </div>
          <div>
            <p className="font-medium">Operador</p>
            <p className="mt-0.5">{operatorLabel}</p>
          </div>
        </div>
      </div>
    </article>
  );
};