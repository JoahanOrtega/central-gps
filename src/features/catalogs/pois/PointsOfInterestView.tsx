import { use, useEffect, useState } from "react";
import { MapPinned, Plus, Search } from "lucide-react";

import { poiService } from "./poiService";
import type { PoiItem } from "./poi.types";
import { PoiCard } from "./PoiCard";
import { NewPoiModal } from "./NewPoiModal";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";

export const PointsOfInterestView = () => {
  const [pois, setPois] = useState<PoiItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { idEmpresa } = useEmpresaActiva();

  const loadPois = async (searchValue = "") => {
    try {
      setIsLoading(true);
      setError("");
      const data = await poiService.getPois(searchValue);
      setPois(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al cargar los POIs";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Recargar cuando cambia la empresa activa
  useEffect(() => {
    setPois([]);
    setSearch("");
    loadPois();
  }, [idEmpresa]);

  // Recargar cuando cambia el buscador
  useEffect(() => {
    if (!idEmpresa) return;
    const timeout = setTimeout(() => loadPois(search), 350);
    return () => clearTimeout(timeout);
  }, [search, idEmpresa]);

  return (
    <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
      <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <MapPinned className="h-5 w-5 text-slate-500" />
              <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">
                Catálogo de Puntos de Interés
              </h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex h-10 w-full items-center justify-center rounded-lg border border-emerald-400 bg-white text-emerald-500 hover:bg-emerald-50 sm:w-12"
                title="Agregar POI"
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
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {isLoading && (
            <div className="py-10 text-center text-slate-500">
              Cargando POIs...
            </div>
          )}

          {error && (
            <div className="py-10 text-center text-red-500">{error}</div>
          )}

          {!isLoading && !error && pois.length === 0 && (
            <div className="py-10 text-center text-slate-500">
              No hay puntos de interés para mostrar
            </div>
          )}

          {!isLoading && !error && pois.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:gap-6 2xl:grid-cols-2">
              {pois.map((poi) => (
                <PoiCard key={poi.id_poi} poi={poi} />
              ))}
            </div>
          )}
        </div>
      </section>

      <NewPoiModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreated={() => loadPois(search)}
      />
    </main>
  );
};
