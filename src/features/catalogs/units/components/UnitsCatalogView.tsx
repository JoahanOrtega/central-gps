import { useState } from "react";
import { BusFront, Plus, Search, Download, TriangleAlert, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { unitService } from "../services/unitService";
import type { UnitItem } from "../types/unit.types";
import { UnitCard } from "./UnitCard";
import { NewUnitModal } from "./NewUnitModal";
import { EditUnitModal } from "./EditUnitModal";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { usePermiso } from "@/hooks/usePermiso";
import { SkeletonGrid } from "@/components/shared/SkeletonCard";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { EmptyState } from "@/components/shared/EmptyState";
import { queryKeys } from "@/lib/query-keys";

export const UnitsCatalogView = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // id de la unidad que se está editando — null cuando el modal está cerrado.
  // Usamos el id como source of truth para que el modal sepa qué cargar
  // sin que el parent tenga que pasar el UnitItem completo (menos acoplamiento).
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const { idEmpresa } = useEmpresaActiva();

  // Permiso para crear unidades (cund3).
  // Si el usuario no lo tiene, el botón "Agregar" queda oculto.
  // El backend también valida este permiso — esto es solo UX para
  // evitar mostrar un botón que respondería 403.
  const puedeCrearUnidad = usePermiso("cund3");

  // Permiso para editar unidades (cund_edit). Determina si las cards
  // muestran el menú de acciones con "Editar". sudo_erp lo tiene por
  // bypass; admin_empresa lo hereda del rol; usuario solo si su admin
  // se lo asignó vía r_usuario_permisos.
  const puedeEditarUnidad = usePermiso("cund_edit");

  // Debounce de 350ms — actualiza la queryKey solo después de que el usuario
  // deja de escribir, evitando una petición por cada tecla presionada
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout((handleSearchChange as unknown as { _t: ReturnType<typeof setTimeout> })._t);
    (handleSearchChange as unknown as { _t: ReturnType<typeof setTimeout> })._t =
      setTimeout(() => setDebouncedSearch(value), 350);
  };

  const { data: units = [], isLoading, error, refetch } = useQuery<UnitItem[]>({
    queryKey: queryKeys.units.list(idEmpresa, debouncedSearch),
    queryFn: () => unitService.getUnits(debouncedSearch, idEmpresa),
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
              <BusFront className="h-5 w-5 text-slate-500" />
              <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">Catálogo de Unidades</h1>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:flex-nowrap">
              {puedeCrearUnidad && (
                <button type="button" onClick={() => setIsCreateModalOpen(true)} className="flex h-10 w-full items-center justify-center rounded-lg border border-emerald-400 bg-white text-emerald-500 hover:bg-emerald-50 sm:w-12" title="Agregar unidad">
                  <Plus className="h-4 w-4" />
                </button>
              )}
              <div className="flex w-full items-center rounded-lg border border-slate-300 bg-white sm:w-auto">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-r border-slate-300 text-emerald-500">
                  <Search className="h-4 w-4" />
                </div>
                <input type="text" value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="buscar..." aria-label="Buscar unidades" className="h-10 w-full min-w-0 rounded-r-lg px-3 text-sm outline-none sm:w-56" />
              </div>
              <div className="flex items-center justify-end gap-2 sm:justify-start">
                <button type="button" disabled className="rounded-lg p-2 text-slate-300 cursor-not-allowed" title="Descargar (próximamente)"><Download className="h-5 w-5" /></button>
                <button type="button" disabled className="rounded-lg p-2 text-slate-300 cursor-not-allowed" title="Alertas (próximamente)"><TriangleAlert className="h-5 w-5" /></button>
                <button type="button" disabled className="rounded-lg p-2 text-slate-300 cursor-not-allowed" title="Cerrar (próximamente)"><X className="h-5 w-5" /></button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 px-4 py-4 md:px-6">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700">
              Todas <span className="ml-1 text-slate-400">{units.length}</span>
            </button>
            <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700">
              Sin Grupo <span className="ml-1 text-slate-400">{units.length}</span>
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {showSkeleton && <SkeletonGrid variant="unit" count={6} />}

          {errorMessage && (
            <EmptyState icon={BusFront} title="No se pudieron cargar las unidades" description={errorMessage} actionLabel="Reintentar" onAction={() => refetch()} />
          )}

          {!showSkeleton && !errorMessage && units.length === 0 && (
            debouncedSearch ? (
              <EmptyState icon={BusFront} title="Sin resultados" description={`No se encontraron unidades que coincidan con "${debouncedSearch}".`} actionLabel="Limpiar búsqueda" onAction={() => { setSearch(""); setDebouncedSearch(""); }} />
            ) : (
              <EmptyState icon={BusFront} title="No hay unidades registradas" description="Agrega la primera unidad para comenzar a gestionar tu flota." actionLabel="+ Agregar unidad" onAction={() => setIsCreateModalOpen(true)} />
            )
          )}

          {!showSkeleton && !errorMessage && units.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:gap-6 2xl:grid-cols-2">
              {units.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  canEdit={puedeEditarUnidad}
                  onEdit={(id) => setEditingUnitId(id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <NewUnitModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} onCreated={() => refetch()} />

      {/* Modal de edición. Se controla con editingUnitId: null = cerrado.
          El modal fetchea el detalle por su cuenta cuando cambia el id,
          así evitamos prefetchear en el parent datos que tal vez no se usen. */}
      <EditUnitModal
        idUnidad={editingUnitId}
        onClose={() => setEditingUnitId(null)}
      />
    </main>
  );
};