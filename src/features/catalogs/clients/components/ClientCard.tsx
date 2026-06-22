import { Building2, MapPin, Bell, Pencil, Trash2 } from "lucide-react";
import { KebabMenu } from "@/components/shared";
import type { ClientItem } from "./client.types";

interface ClientCardProps {
  client: ClientItem;
  canEdit?:    boolean;
  canDelete?:  boolean;
  onEdit?:     (idCliente: number) => void;
  onDelete?:   (client: ClientItem) => void;
  onAlertas?:  (client: ClientItem) => void;
}

export const ClientCard = ({
  client,
  canEdit    = false,
  canDelete  = false,
  onEdit,
  onDelete,
  onAlertas,
}: ClientCardProps) => {
  const menuItems = [
    canEdit && {
      id: "edit",
      label: "Editar",
      icon: Pencil,
      onClick: () => onEdit?.(client.id_cliente),
    },
    // Alertas solo disponibles si el cliente tiene ubicación configurada.
    canEdit && {
      id: "alertas",
      label: "Alertas",
      icon: Bell,
      onClick: () => onAlertas?.(client),
    },
    canDelete && {
      id: "delete",
      label: "Eliminar",
      icon: Trash2,
      variant: "destructive" as const,
      onClick: () => onDelete?.(client),
    },
  ].filter(Boolean) as React.ComponentProps<typeof KebabMenu>["items"];

  return (
    <article className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-2xl font-semibold text-slate-800">
            {client.nombre}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{client.clave}</p>
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            {client.imagen ? (
              <img
                src={client.imagen}
                alt={`Logo de ${client.nombre}`}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <Building2 className="h-4 w-4 text-slate-500" />
            )}
          </div>

          {menuItems.length > 0 && (
            <KebabMenu items={menuItems} entityName={client.nombre} />
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-slate-700">
        <div>
          <p className="font-medium">Contacto</p>
          <p>{client.contacto || "---"}</p>
        </div>

        <div>
          <p className="font-medium">Teléfono</p>
          <p>{client.telefono || "---"}</p>
        </div>

        <div className="col-span-2">
          <p className="font-medium">Email</p>
          <p className="truncate">{client.email || "---"}</p>
        </div>

        {client.direccion && (
          <div className="col-span-2 flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p className="line-clamp-2 text-slate-500">{client.direccion}</p>
          </div>
        )}
      </div>
    </article>
  );
};