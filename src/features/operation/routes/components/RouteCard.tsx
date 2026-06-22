import { Route as RouteIcon, MapPin, Pencil, Trash2 } from "lucide-react";
import { KebabMenu } from "@/components/shared";
import type { RouteItem, TipoRuta } from "../types/route.types";

interface RouteCardProps {
  route:      RouteItem;
  canEdit?:   boolean;
  canDelete?: boolean;
  onEdit?:    (idRuta: number) => void;
  onDelete?:  (route: RouteItem) => void;
}

// Etiqueta legible para cada tipo de ruta
const TIPO_LABEL: Record<TipoRuta, string> = {
  transporte_personal: "Transporte de Personal",
  transporte_publico:  "Transporte Público Colectivo",
  reparto:             "Reparto (Última milla)",
  viaje_especial:      "Viaje Especial",
};

export const RouteCard = ({
  route,
  canEdit    = false,
  canDelete  = false,
  onEdit,
  onDelete,
}: RouteCardProps) => {
  const menuItems = [
    canEdit && {
      id: "edit",
      label: "Editar",
      icon: Pencil,
      onClick: () => onEdit?.(route.id_ruta),
    },
    canDelete && {
      id: "delete",
      label: "Eliminar",
      icon: Trash2,
      variant: "destructive" as const,
      onClick: () => onDelete?.(route),
    },
  ].filter(Boolean) as React.ComponentProps<typeof KebabMenu>["items"];

  return (
    <article className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-semibold text-slate-800">
            {route.nombre}
          </h3>
          {route.clave && (
            <p className="mt-0.5 text-sm text-slate-500">{route.clave}</p>
          )}
          <span className="mt-2 inline-block rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-medium text-cyan-700">
            {TIPO_LABEL[route.tipo]}
          </span>
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            <RouteIcon className="h-4 w-4 text-slate-500" />
          </div>
          {menuItems.length > 0 && (
            <KebabMenu items={menuItems} entityName={route.nombre} />
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-slate-700">
        <div>
          <p className="font-medium">Cliente</p>
          <p className="truncate">{route.cliente || "---"}</p>
        </div>
        <div>
          <p className="font-medium">Logísticas</p>
          {/* 1 = solo ida, 2 = ida y vuelta */}
          <p>{route.total_logisticas === 2 ? "Ida y vuelta" : "Solo ida"}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p>{route.total_paradas} parada{route.total_paradas !== 1 ? "s" : ""}</p>
        </div>
        <div>
          <p className="font-medium">Kilómetros</p>
          <p>{route.kilometros !== null ? `${route.kilometros} km` : "---"}</p>
        </div>
      </div>
    </article>
  );
};