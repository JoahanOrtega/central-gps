import { useEffect, useRef, useState } from "react";
import type { UnitItem } from "../types/unit.types";
import { BusFront, MoreHorizontal, FileImage, Pencil, Trash2 } from "lucide-react";

interface UnitCardProps {
  unit: UnitItem;
  // Visible solo cuando el usuario tiene permiso unidades.editar.
  // El caller (UnitsCatalogView) resuelve el permiso una vez y lo pasa
  // al mapear — evitamos que cada card consulte el store por su cuenta.
  canEdit?: boolean;
  // Visible solo cuando el usuario tiene permiso unidades.eliminar.
  // Igual que canEdit, el padre lo resuelve una vez.
  canDelete?: boolean;
  // Callback al hacer click en "Editar". Recibe el id para que el
  // parent abra el modal correspondiente.
  onEdit?: (idUnidad: number) => void;
  // Callback al hacer click en "Eliminar". Recibe la unidad completa
  // (no solo el id) para que el parent pueda mostrar el nombre/numero
  // en el diálogo de confirmación sin tener que volver a buscarla.
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
  const operatorLabel = unit.id_operador
    ? `Operador ${unit.id_operador}`
    : "--- --- ---";

  // Menú kebab: abierto/cerrado + ref para detectar clicks fuera.
  // Cerrar al hacer click fuera es la expectativa universal (Jakob).
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

  // Cerrar menú con Escape (accesibilidad).
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
    onEdit?.(unit.id);
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    onDelete?.(unit);
  };

  // El menú aparece si tiene CUALQUIER acción disponible.
  // Ocultar el botón cuando no hay acciones evita un kebab "muerto"
  // que confunde al usuario al hacer click y no pasar nada.
  const hasAnyAction = canEdit || canDelete;

  return (
    <article className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-3xl font-semibold text-slate-800">
            {unit.numero}
          </h3>
          <p className="mt-1 text-lg text-slate-700">
            {unit.marca} {unit.modelo}
          </p>
          <p className="mt-2 text-sm text-slate-500">{statusLabel}</p>
        </div>

        {/* Kebab menu — solo si el usuario tiene al menos una acción
            disponible. Hoy "Editar" y "Eliminar"; en el futuro habrá más
            (Detalles, Historial, Alertas, Token de Rastreo). */}
        {hasAnyAction && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Acciones de la unidad"
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

                {/* Separador visual entre acción "neutra" (editar) y
                    acción "destructiva" (eliminar). Refuerza visualmente
                    que son dos categorías de operaciones. */}
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