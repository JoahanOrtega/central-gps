import { useEffect, useRef, useState } from "react";
import { Building2, MoreHorizontal, Pencil, Trash2, MapPin, Phone, Mail } from "lucide-react";
import type { ClientItem } from "./client.types";

interface ClientCardProps {
  client: ClientItem;
  canEdit?:   boolean;
  canDelete?: boolean;
  onEdit?:    (idCliente: number) => void;
  onDelete?:  (client: ClientItem) => void;
}

export const ClientCard = ({
  client,
  canEdit   = false,
  canDelete = false,
  onEdit,
  onDelete,
}: ClientCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Cerrar con Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  const handleEditClick = () => {
    setMenuOpen(false);
    onEdit?.(client.id_cliente);
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    onDelete?.(client);
  };

  const hasAnyAction = canEdit || canDelete;

  return (
    <article className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Nombre del cliente */}
          <h3 className="truncate text-2xl font-semibold text-slate-800">
            {client.nombre}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {client.clave}
          </p>
        </div>

        <div className="flex shrink-0 items-start gap-2">
          {/* Avatar del cliente */}
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

          {hasAnyAction && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Acciones de ${client.nombre}`}
                onClick={() => setMenuOpen((prev) => !prev)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
                >
                  {canEdit && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleEditClick}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4 text-slate-500" />
                      Editar
                    </button>
                  )}

                  {/* Separador visual entre acción neutral y destructiva */}
                  {canEdit && canDelete && (
                    <div className="border-t border-slate-100" aria-hidden="true" />
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleDeleteClick}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Datos de contacto */}
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