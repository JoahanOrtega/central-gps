import { useState } from "react";
import { MapPinned, Plus, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { poiService } from "./poiService";
import type { PoiItem } from "./poi.types";
import { PoiCard } from "./PoiCard";
import { NewPoiModal } from "./NewPoiModal";
import { EditPoiModal } from "./EditPoiModal";
import { PoiAlertasModal } from "./PoiAlertasModal";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { SkeletonGrid } from "@/components/shared/SkeletonCard";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { notify } from "@/stores/notificationStore";
import { queryKeys } from "@/lib/query-keys";

export const PointsOfInterestView = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Estado de edición — guardamos el POI completo (no solo el id) porque
  // EditPoiModal lo recibe como prop y lo usa para pre-poblar el form
  // sin necesidad de hacer otro fetch al backend. Como la lista ya tiene
  // los datos cacheados, evitamos un round-trip innecesario.
  const [editingPoi, setEditingPoi] = useState<PoiItem | null>(null);

  // Estado de confirmación de eliminación. Mismo patrón que UnitsCatalogView:
  // el POI completo permite mostrar el nombre en el ConfirmDialog.
  const [poiToDelete, setPoiToDelete] = useState<PoiItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [alertasPoi, setAlertasPoi] = useState<PoiItem | null>(null);


  const { idEmpresa } = useEmpresaActiva();

  // ── Permisos de POIs ──────────────────────────────────────────────────────
  // Los POIs no usan permisos granulares en este proyecto — el catálogo
  // permite a cualquier usuario autenticado de la empresa crear/editar/
  // eliminar sus propios POIs. La autorización real está en el backend,
  // que valida que el POI pertenezca a la empresa del usuario en cada
  // request.
  //
  // Si en el futuro se decide implementar permisos granulares (pois.crear,
  // pois.editar, pois.eliminar), basta con agregar usePermiso aquí y
  // pasar las flags a las cards — el patrón ya está armado.
  const puedeEditarPoi = true;
  const puedeEliminarPoi = true;

  // TanStack Query — caché por empresa+búsqueda.
  // El debounce de 350ms se implementa manteniendo el search en estado local
  // y pasándolo a la queryKey tras un timeout — useQuery reacciona al cambiar la key.
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleAskAlertas = (poi: PoiItem) => setAlertasPoi(poi);
  const handleCloseAlertas = () => setAlertasPoi(null);


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

  // ── Handlers de edición ───────────────────────────────────────────────────
  // El modal se monta condicionalmente cuando editingPoi !== null. Su
  // onClose simplemente limpia el estado — el componente se desmonta
  // automáticamente y libera los listeners del Dialog.

  const handleAskEdit = (poi: PoiItem) => {
    setEditingPoi(poi);
  };

  const handleCloseEdit = () => {
    setEditingPoi(null);
  };

  // ── Handlers de eliminación ───────────────────────────────────────────────
  // Mismo patrón que en UnitsCatalogView para mantener consistencia entre
  // catálogos. Si en el futuro se extrae un hook useCrudActions, ambas
  // vistas pueden compartirlo.

  const handleAskDelete = (poi: PoiItem) => {
    setPoiToDelete(poi);
  };

  const handleCancelDelete = () => {
    if (!isDeleting) setPoiToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!poiToDelete) return;
    setIsDeleting(true);
    try {
      await poiService.deletePoi(poiToDelete.id_poi, idEmpresa);

      // Invalidar TODAS las queries de pois — afecta listado, búsquedas
      // y groups (porque al eliminar un POI cambia el conteo de pois en
      // los grupos que lo contenían).
      await queryClient.invalidateQueries({ queryKey: queryKeys.pois.all });

      notify.success(
        `Punto de interés "${poiToDelete.nombre}" eliminado correctamente`,
      );
      setPoiToDelete(null);
    } catch (err) {
      notify.error(
        err instanceof Error
          ? err.message
          : "No fue posible eliminar el punto de interés",
      );
      // No cerrar el confirm en caso de error — el usuario decide.
    } finally {
      setIsDeleting(false);
    }
  };

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
              {pois.map((poi) => (
                <PoiCard
                  key={poi.id_poi}
                  poi={poi}
                  canEdit={puedeEditarPoi}
                  canDelete={puedeEliminarPoi}
                  onEdit={handleAskEdit}
                  onDelete={handleAskDelete}
                  onAlertas={handleAskAlertas}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <NewPoiModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} onCreated={() => refetch()} />

      {/* Modal de edición — se monta cuando hay un POI seleccionado.
          El modal recibe el POI completo y se encarga de invalidar
          el caché por su cuenta tras un PATCH exitoso. */}
      <EditPoiModal
        poi={editingPoi}
        onClose={handleCloseEdit}
      />

      {/* ── Confirm de eliminación ──────────────────────────────────────────
          Mismo patrón que en UnitsCatalogView — el nombre del POI se
          muestra en la descripción para que el usuario tenga claridad
          sobre qué va a eliminar antes de confirmar. */}
      <ConfirmDialog
        open={poiToDelete !== null}
        onOpenChange={(open) => !open && handleCancelDelete()}
        title="Eliminar punto de interés"
        description={
          poiToDelete
            ? `¿Estás seguro de eliminar "${poiToDelete.nombre}"? Esta acción no se puede deshacer desde la interfaz.`
            : ""
        }
        confirmText={isDeleting ? "ELIMINANDO..." : "ELIMINAR"}
        confirmButtonClassName="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        onConfirm={handleConfirmDelete}
      />

      <PoiAlertasModal
        poi={alertasPoi}
        onClose={handleCloseAlertas}
      />
    </main>
  );
};