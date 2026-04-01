import { useEffect, useState } from "react";
import {
  BusFront,
  Plus,
  Search,
  Download,
  TriangleAlert,
  X,
} from "lucide-react";

import { unitService } from "../../services/unitService";
import type { UnitItem } from "../../types/unit.types";
import { UnitCard } from "./UnitCard";
import { NewUnitModal } from "./NewUnitModal";

export const UnitsCatalogView = () => {
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadUnits = async (searchValue = "") => {
    try {
      setIsLoading(true);
      setError("");

      const data = await unitService.getUnits(searchValue);
      setUnits(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al cargar unidades";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadUnits(search);
    }, 350);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    loadUnits();
  }, []);

  return (
    <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
      <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <BusFront className="h-5 w-5 text-slate-500" />
              <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">
                Catálogo de Unidades
              </h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:flex-nowrap">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex h-10 w-full items-center justify-center rounded-lg border border-emerald-400 bg-white text-emerald-500 hover:bg-emerald-50 sm:w-12"
                title="Agregar unidad"
              >
                <Plus className="h-4 w-4" />
              </button>

              <div className="flex w-full items-center rounded-lg border border-slate-300 bg-white sm:w-auto">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-r border-slate-300 text-emerald-500">
                  <Search className="h-4 w-4" />
                </div>

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="buscar..."
                  className="h-10 w-full min-w-0 rounded-r-lg px-3 text-sm outline-none sm:w-56"
                />
              </div>

              <div className="flex items-center justify-end gap-2 sm:justify-start">
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  title="Descargar"
                >
                  <Download className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-amber-500"
                  title="Alertas"
                >
                  <TriangleAlert className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  title="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 px-4 py-4 md:px-6">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700"
            >
              Todas <span className="ml-1 text-slate-400">{units.length}</span>
            </button>

            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700"
            >
              Sin Grupo <span className="ml-1 text-slate-400">{units.length}</span>
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {isLoading && (
            <div className="py-10 text-center text-slate-500">
              Cargando unidades...
            </div>
          )}

          {error && (
            <div className="py-10 text-center text-red-500">{error}</div>
          )}

          {!isLoading && !error && units.length === 0 && (
            <div className="py-10 text-center text-slate-500">
              No hay unidades para mostrar
            </div>
          )}

          {!isLoading && !error && units.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:gap-6 2xl:grid-cols-2">
              {units.map((unit) => (
                <UnitCard key={unit.id} unit={unit} />
              ))}
            </div>
          )}
        </div>
      </section>

      <NewUnitModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreated={() => loadUnits(search)}
      />
    </main>
  );
};
