import { useState } from "react";
import { MapPinned, Plus, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { poiService } from "./poiService";
import type { PoiItem } from "./poi.types";
import { PoiCard } from "./PoiCard";
import { NewPoiModal } from "./NewPoiModal";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { SkeletonGrid } from "@/components/shared/SkeletonCard";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { EmptyState } from "@/components/shared/EmptyState";
import { queryKeys } from "@/lib/query-keys";

export const PointsOfInterestView = () => {
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { idEmpresa } = useEmpresaActiva();

  // TanStack Query — caché por empresa+búsqueda.
  // El debounce de 350ms se implementa manteniendo el search en estado local
  // y pasándolo a la queryKey tras un timeout — useQuery reacciona al cambiar la key.
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout((handleSearchChange as unknown as { _t: ReturnType<typeof setTimeout> })._t);
    (handleSearchChange as unknown as { _t: ReturnType<typeof setTimeout> })._t =
      setTimeout(() => setDebouncedSearch(value), 350);
  };

  const { data: pois = [], isLoading, error, refetch } = useQuery<PoiItem[]>({
    queryKey: queryKeys.pois.list(idEmpresa, debouncedSearch),
    queryFn: () => poiService.getPois(debouncedSearch, idEmpresa),
    enabled: !!idEmpresa,
  });

  const showSkeleton = useDelayedLoading(isLoading);
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
      <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <MapPinned className="h-5 w-5 text-slate-500" />
              <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">Catálogo de Puntos de Interés</h1>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={() => setIsCreateModalOpen(true)} className="flex h-10 w-full items-center justify-center rounded-lg border border-emerald-400 bg-white text-emerald-500 hover:bg-emerald-50 sm:w-12" title="Agregar POI">
                <Plus className="h-4 w-4" />
              </button>
              <div className="flex w-full items-center rounded-lg border border-slate-300 bg-white sm:w-auto">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-r border-slate-300 text-emerald-500">
                  <Search className="h-4 w-4" />
                </div>
                <input type="text" value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="buscar..." aria-label="Buscar puntos de interés" className="h-10 w-full min-w-0 rounded-r-lg px-3 text-sm outline-none sm:w-56" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {showSkeleton && <SkeletonGrid variant="poi" count={6} />}

          {errorMessage && (
            <EmptyState icon={MapPinned} title="No se pudieron cargar los puntos de interés" description={errorMessage} actionLabel="Reintentar" onAction={() => refetch()} />
          )}

          {!showSkeleton && !errorMessage && pois.length === 0 && (
            debouncedSearch ? (
              <EmptyState icon={MapPinned} title="Sin resultados" description={`No se encontraron puntos de interés que coincidan con "${debouncedSearch}".`} actionLabel="Limpiar búsqueda" onAction={() => { setSearch(""); setDebouncedSearch(""); }} />
            ) : (
              <EmptyState icon={MapPinned} title="No hay puntos de interés registrados" description="Agrega el primer punto de interés para comenzar a organizar tus ubicaciones." actionLabel="+ Agregar punto de interés" onAction={() => setIsCreateModalOpen(true)} />
            )
          )}

          {!showSkeleton && !errorMessage && pois.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:gap-6 2xl:grid-cols-2">
              {pois.map((poi) => <PoiCard key={poi.id_poi} poi={poi} />)}
            </div>
          )}
        </div>
      </section>

      <NewPoiModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} onCreated={() => refetch()} />
    </main>
  );
};