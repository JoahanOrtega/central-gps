import { Plus, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CatalogHeaderProps {
  // Ícono del catálogo (Building2, MapPinned, Users, BusFront...)
  icon: LucideIcon;
  title: string;
  // Texto debajo del título
  subtitle?: string;
  // Busqueda
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  // Botón agregar (si se pasa onAdd)
  onAdd?: () => void;
  addLabel?: string;
  // Contenido extra en la barra de herramientas (filtros, exportar, etc.)
  toolbarExtra?: React.ReactNode;
}

// Encabezado estándar de los catálogos del sistema.
export const CatalogHeader = ({
  icon: Icon,
  title,
  subtitle,
  search,
  onSearchChange,
  searchPlaceholder = "buscar...",
  onAdd,
  toolbarExtra,
}: CatalogHeaderProps) => {
  return (
    <div className="border-b border-slate-200 px-4 py-4 md:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

        {/* Título */}
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-slate-500" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-slate-400">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Toolbar: botón agregar + búsqueda + extras */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

          {/* Botón agregar */}
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="flex h-10 w-full items-center justify-center rounded-lg border border-emerald-400 bg-white text-emerald-500 hover:bg-emerald-50 sm:w-12"
              title="Agregar registro"
              aria-label="Agregar registro"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}

          {/* Contenido extra */}
          {toolbarExtra}

          {/* Campo de busqueda */}
          <div className="flex w-full items-center rounded-lg border border-slate-300 bg-white sm:w-auto">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border-r border-slate-300 text-emerald-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={`Buscar en ${title}`}
              className="h-10 w-full min-w-0 rounded-r-lg px-3 text-sm outline-none sm:w-56"
            />
            {/* Botón limpiar */}
            {search && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => onSearchChange("")}
                className="mr-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};