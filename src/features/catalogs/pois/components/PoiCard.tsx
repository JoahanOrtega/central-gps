import { Bell, Circle, Pentagon, Pencil, Trash2 } from "lucide-react";
import type { PoiItem } from "./poi.types";
import { KebabMenu } from "@/components/shared";

interface PoiCardProps {
  poi: PoiItem;
  canEdit?:    boolean;
  canDelete?:  boolean;
  onEdit?:     (poi: PoiItem) => void;
  onDelete?:   (poi: PoiItem) => void;
  onAlertas?:  (poi: PoiItem) => void;
}

export const PoiCard = ({
  poi,
  canEdit   = false,
  canDelete = false,
  onEdit,
  onDelete,
  onAlertas,
}: PoiCardProps) => {
  const menuItems = [
    canEdit && {
      id: "edit",
      label: "Editar",
      icon: Pencil,
      onClick: () => onEdit?.(poi),
    },
    canEdit && {
      id: "alertas",
      label: "Alertas",
      icon: Bell,
      onClick: () => onAlertas?.(poi),
    },
    canDelete && {
      id: "delete",
      label: "Eliminar",
      icon: Trash2,
      variant: "destructive" as const,
      onClick: () => onDelete?.(poi),
    },
  ].filter(Boolean) as React.ComponentProps<typeof KebabMenu>["items"];

  return (
    <article className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-2xl font-semibold text-slate-800">{poi.nombre}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {poi.direccion || "Sin dirección"}
          </p>
        </div>

        <div className="flex shrink-0 items-start gap-2">
          {/* Ícono de tipo de geometría */}
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500"
            title={poi.tipo_poi === 1 ? "Marcador" : "Polígono"}
          >
            {poi.tipo_poi === 1 ? (
              <Circle className="h-4 w-4" />
            ) : (
              <Pentagon className="h-4 w-4" />
            )}
          </div>

          {menuItems.length > 0 && (
            <KebabMenu items={menuItems} entityName={poi.nombre} />
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-slate-700">
        <div>
          <p className="font-medium">Elemento</p>
          <p>{poi.tipo_elemento}</p>
        </div>
        <div>
          <p className="font-medium">Radio</p>
          <p>{poi.radio}</p>
        </div>
        <div>
          <p className="font-medium">Latitud</p>
          <p>{poi.lat ?? "---"}</p>
        </div>
        <div>
          <p className="font-medium">Longitud</p>
          <p>{poi.lng ?? "---"}</p>
        </div>
      </div>
    </article>
  );
};