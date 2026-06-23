import { useState } from "react";
import { MapPinned } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { poiService } from "../services/poiService";
import type { PoiItem } from "../types/poi.types";
import { PoiCard } from "./PoiCard";
import { NewPoiModal } from "./NewPoiModal";
import { EditPoiModal } from "./EditPoiModal";
import { PoiAlertasModal } from "./PoiAlertasModal";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { queryKeys } from "@/lib/query-keys";
import {
  CatalogLayout,
  CatalogHeader,
  CatalogGrid,
  useDebounce,
  useDeleteConfirm,
} from "@/components/shared";

export const PointsOfInterestView = () => {
  const queryClient = useQueryClient();
  const { idEmpresa } = useEmpresaActiva();

  const [search, setSearch]           = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPoi, setEditingPoi]   = useState<PoiItem | null>(null);
  const [alertasPoi, setAlertasPoi]   = useState<PoiItem | null>(null);

  const debouncedSearch = useDebounce(search);

  const puedeEditarPoi   = true;
  const puedeEliminarPoi = true;

  const { data: pois = [], isLoading, error, refetch } = useQuery<PoiItem[]>({
    queryKey: queryKeys.pois.list(idEmpresa, debouncedSearch),
    queryFn: () => poiService.getPois(debouncedSearch, idEmpresa),
    enabled: !!idEmpresa,
  });

  const showSkeleton = useDelayedLoading(isLoading);
  const errorMessage = error instanceof Error ? error.message : null;

  const { itemToDelete, isDeleting, askDelete, cancelDelete, confirmDelete } =
    useDeleteConfirm<PoiItem>({
      deleteFn: async (poi) => {
        await poiService.deletePoi(poi.id_poi, idEmpresa);
        // Invalida todos los POIs para refrescar la lista después de eliminar
        await queryClient.invalidateQueries({ queryKey: queryKeys.pois.all });
      },
      successMessage: (poi) => `Punto de interés "${poi.nombre}" eliminado correctamente`,
    });

  return (
    <CatalogLayout>
      <CatalogHeader
        icon={MapPinned}
        title="Catálogo de Puntos de Interés"
        search={search}
        onSearchChange={setSearch}
        onAdd={() => setIsCreateModalOpen(true)}
      />

      <div className="p-4 md:p-6">
        <CatalogGrid
          isLoading={showSkeleton}
          errorMessage={errorMessage}
          items={pois}
          activeSearch={debouncedSearch}
          renderItem={(poi) => (
            <PoiCard
              poi={poi}
              canEdit={puedeEditarPoi}
              canDelete={puedeEliminarPoi}
              onEdit={setEditingPoi}
              onDelete={askDelete}
              onAlertas={setAlertasPoi}
            />
          )}
          keyExtractor={(poi) => poi.id_poi}
          skeletonVariant="poi"
          icon={MapPinned}
          emptyTitle="No hay puntos de interés registrados"
          emptyDescription="Agrega el primer punto de interés para comenzar a organizar tus ubicaciones."
          emptyActionLabel="+ Agregar punto de interés"
          onEmptyAction={() => setIsCreateModalOpen(true)}
          onRetry={refetch}
          onClearSearch={() => setSearch("")}
        />
      </div>

      <NewPoiModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreated={() => refetch()}
      />

      <EditPoiModal poi={editingPoi} onClose={() => setEditingPoi(null)} />

      <PoiAlertasModal poi={alertasPoi} onClose={() => setAlertasPoi(null)} />

      <ConfirmDialog
        open={itemToDelete !== null}
        onOpenChange={(open) => !open && cancelDelete()}
        title="Eliminar punto de interés"
        description={
          itemToDelete
            ? `¿Estás seguro de eliminar "${itemToDelete.nombre}"? Esta acción no se puede deshacer desde la interfaz.`
            : ""
        }
        confirmText={isDeleting ? "ELIMINANDO..." : "ELIMINAR"}
        confirmButtonClassName="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        onConfirm={confirmDelete}
      />
    </CatalogLayout>
  );
};