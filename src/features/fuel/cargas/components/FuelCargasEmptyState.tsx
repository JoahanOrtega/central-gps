import { Fuel, Plus } from "lucide-react";

interface FuelCargasEmptyStateProps {
  search: string;
  onClearSearch: () => void;
  puedeCrear: boolean;
  onAddClick: () => void;
}

export const FuelCargasEmptyState = ({ search, onClearSearch, puedeCrear, onAddClick }: FuelCargasEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center max-w-xl mx-auto my-8">
      <div className="p-4 bg-slate-100 text-slate-400 rounded-full mb-4">
        <Fuel className="h-10 w-10" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">
        {search ? "No se encontraron resultados" : "No hay cargas de combustible registradas"}
      </h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        {search 
          ? `No encontramos coincidencias para "${search}".` 
          : "Aún no hay cargas de combustible. Puedes agregar una manualmente o usar el botón de carga masiva arriba."}
      </p>
      {puedeCrear && !search && (
        <button
          onClick={onAddClick}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white shadow hover:bg-emerald-700 transition-colors gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Agregar carga</span>
        </button>
      )}
      {search && (
        <button onClick={onClearSearch} className="text-sm font-medium text-blue-600 hover:underline">
          Limpiar búsqueda
        </button>
      )}
    </div>
  );
};