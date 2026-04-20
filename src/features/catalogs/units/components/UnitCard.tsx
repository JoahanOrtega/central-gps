import { useEffect, useRef, useState } from "react";
import type { UnitItem } from "../types/unit.types";
import { BusFront, MoreHorizontal, FileImage, Pencil } from "lucide-react";

interface UnitCardProps {
  unit: UnitItem;
  // Visible solo cuando el usuario tiene permiso cund_edit.
  // El caller (UnitsCatalogView) resuelve el permiso una vez y lo pasa
  // al mapear — evitamos que cada card consulte el store por su cuenta.
  canEdit?: boolean;
  // Callback al hacer click en "Editar". Recibe el id para que el
  // parent abra el modal correspondiente.
  onEdit?: (idUnidad: number) => void;
}

export const UnitCard = ({ unit, canEdit = false, onEdit }: UnitCardProps) => {
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
            disponible. Hoy solo "Editar"; en el futuro habrá más
            (Detalles, Historial, Alertas, Token de Rastreo). */}
        {canEdit && (
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
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleEditClick}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4 text-slate-500" />
                  Editar
                </button>
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