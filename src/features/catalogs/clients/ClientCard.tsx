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

  // Menú kebab para acciones de Editar/Eliminar
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Cerrar con Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
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

  // Ocultar el kebab si no hay ninguna acción disponible
  const hasAnyAction = canEdit || canDelete;

  return (
    <article className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">

      {/* Encabezado: nombre + menú de acciones */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* Ícono del cliente — avatar neutral cuando no hay imagen */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            {client.imagen ? (
              <img
                src={client.imagen}
                alt={`Logo de ${client.nombre}`}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <Building2 className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            {/* truncate evita que nombres largos */}
            <h3 className="truncate text-base font-semibold text-slate-800">
              {client.nombre}
            </h3>
            <p className="text-xs text-slate-400">{client.clave}</p>
          </div>
        </div>

        {/* Menú kebab */}
        {hasAnyAction && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              aria-label="Acciones del cliente"
              aria-haspopup="true"
              aria-expanded={menuOpen}
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

      {/* Datos de contacto */}
      <div className="mt-4 space-y-2">
        {client.direccion && (
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span className="line-clamp-2" title={client.direccion}>
              {client.direccion}
            </span>
          </div>
        )}

        {client.telefono && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
            <span>{client.telefono}</span>
          </div>
        )}

        {client.email && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
            {/* truncate para emails largos */}
            <span className="truncate">{client.email}</span>
          </div>
        )}

        {/* Placeholder cuando el cliente no tiene datos de contacto */}
        {!client.direccion && !client.telefono && !client.email && (
          <p className="text-sm text-slate-400">Sin datos de contacto</p>
        )}
      </div>

      {/* Contacto si existe */}
      {client.contacto && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          Contacto: <span className="text-slate-700">{client.contacto}</span>
        </p>
      )}
    </article>
  );
};