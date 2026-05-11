import { useEffect, useRef, useState } from "react";
import { Bell, Circle, MoreHorizontal, Pencil, Pentagon, Trash2 } from "lucide-react";
import type { PoiItem } from "./poi.types";

interface PoiCardProps {
  poi: PoiItem;
  // Visible solo cuando el usuario tiene permiso para editar.
  // Igual que UnitCard, el padre resuelve el permiso una vez y lo
  // pasa al mapear las cards.
  canEdit?: boolean;
  // Visible solo cuando el usuario tiene permiso para eliminar.
  canDelete?: boolean;
  // Callback al hacer click en "Editar". Recibe el POI completo para
  // que el modal de edición pre-cargue los valores sin re-fetchear.
  onEdit?: (poi: PoiItem) => void;
  // Callback al hacer click en "Eliminar". Recibe el POI completo
  // para que el ConfirmDialog del padre pueda mostrar el nombre.
  onDelete?: (poi: PoiItem) => void;
  onAlertas?: (poi: PoiItem) => void;

}

export const PoiCard = ({
  poi,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
  onAlertas,
}: PoiCardProps) => {
  // Mismo patrón de menú kebab que UnitCard — consistencia entre
  // catálogos. Si en el futuro se extraen utilidades comunes,
  // un hook useDropdownMenu podría centralizar esta lógica.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    onEdit?.(poi);
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    onDelete?.(poi);
  };

  const handleAlertasClick = () => {
    setMenuOpen(false);
    onAlertas?.(poi);
  };

  // El menú solo aparece si hay alguna acción disponible — un kebab
  // sin opciones es más confuso que útil.
  const hasAnyAction = canEdit || canDelete;

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
          {/* Ícono que indica el tipo de geometría — lo mantenemos
              visible siempre porque es información del POI, no acción. */}
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

          {/* Kebab menu — visible solo si hay acciones */}
          {hasAnyAction && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Acciones de ${poi.nombre}`}
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

                  {/* Alertas — entre Editar y Eliminar */}
                  {canEdit && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleAlertasClick}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Bell className="h-4 w-4 text-slate-500" />
                      Alertas
                    </button>
                  )}

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