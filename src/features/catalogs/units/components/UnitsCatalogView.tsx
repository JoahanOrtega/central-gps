import { useState } from "react";
import { BusFront, Download, TriangleAlert, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { unitService } from "../services/unitService";
import type { UnitItem } from "../types/unit.types";
import { UnitCard } from "./UnitCard";
import { NewUnitModal } from "./NewUnitModal";
import { EditUnitModal } from "./EditUnitModal";
import { UnitTokenModal } from "./UnitTokenModal";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { usePermiso } from "@/hooks/usePermiso";
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

export const UnitsCatalogView = () => {
  const queryClient = useQueryClient();
  const { idEmpresa } = useEmpresaActiva();

  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [tokenUnit, setTokenUnit] = useState<UnitItem | null>(null);

  const debouncedSearch = useDebounce(search);

  const puedeCrearUnidad = usePermiso("unidades.crear");
  const puedeEditarUnidad = usePermiso("unidades.editar");
  const puedeEliminarUnidad = usePermiso("unidades.eliminar");

  const { data: units = [], isLoading, error, refetch } = useQuery<UnitItem[]>({
    queryKey: queryKeys.units.list(idEmpresa, debouncedSearch),
    queryFn: () => unitService.getUnits(debouncedSearch, idEmpresa),
    enabled: !!idEmpresa,
  });

  const showSkeleton = useDelayedLoading(isLoading);
  const errorMessage = error instanceof Error ? error.message : null;

  const { itemToDelete, isDeleting, askDelete, cancelDelete, confirmDelete } =
    useDeleteConfirm<UnitItem>({
      deleteFn: async (unit) => {
        await unitService.delete(unit.id, idEmpresa);
        await queryClient.invalidateQueries({ queryKey: queryKeys.units.all });
      },
      successMessage: (unit) => `Unidad ${unit.numero} eliminada correctamente`,
    });

  // Botones extra del toolbar de unidades (funcionalidades pendientes)
  const toolbarExtra = (
    <div className="flex items-center justify-end gap-2 sm:justify-start">
      <button type="button" disabled className="cursor-not-allowed rounded-lg p-2 text-slate-300" title="Descargar (próximamente)">
        <Download className="h-5 w-5" />
      </button>
      <button type="button" disabled className="cursor-not-allowed rounded-lg p-2 text-slate-300" title="Alertas (próximamente)">
        <TriangleAlert className="h-5 w-5" />
      </button>
      <button type="button" disabled className="cursor-not-allowed rounded-lg p-2 text-slate-300" title="Cerrar (próximamente)">
        <X className="h-5 w-5" />
      </button>
    </div>
  );

  return (
    <CatalogLayout>
      <CatalogHeader
        icon={BusFront}
        title="Catálogo de Unidades"
        search={search}
        onSearchChange={setSearch}
        onAdd={puedeCrearUnidad ? () => setIsCreateModalOpen(true) : undefined}
        toolbarExtra={toolbarExtra}
      />

      {/* Barra de pestañas de grupos */}
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
        <CatalogGrid
          isLoading={showSkeleton}
          errorMessage={errorMessage}
          items={units}
          activeSearch={debouncedSearch}
          renderItem={(unit) => (
            <UnitCard
              unit={unit}
              canEdit={puedeEditarUnidad}
              canDelete={puedeEliminarUnidad}
              onEdit={(id) => setEditingUnitId(id)}
              onDelete={askDelete}
              onShowToken={(u) => setTokenUnit(u)}
            />
          )}
          keyExtractor={(unit) => unit.id}
          skeletonVariant="unit"
          icon={BusFront}
          emptyTitle="No hay unidades registradas"
          emptyDescription="Agrega la primera unidad para comenzar a gestionar tu flota."
          emptyActionLabel="+ Agregar unidad"
          onEmptyAction={() => setIsCreateModalOpen(true)}
          onRetry={refetch}
          onClearSearch={() => setSearch("")}
        />
      </div>

      <NewUnitModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreated={() => refetch()}
      />

      <EditUnitModal
        idUnidad={editingUnitId}
        onClose={() => setEditingUnitId(null)}
      />

      <UnitTokenModal
        idUnidad={tokenUnit?.id ?? null}
        numero={tokenUnit?.numero}
        marca={tokenUnit?.marca}
        modelo={tokenUnit?.modelo}
        idEmpresa={idEmpresa}
        canEdit={puedeEditarUnidad}
        onClose={() => setTokenUnit(null)}
      />

      <ConfirmDialog
        open={itemToDelete !== null}
        onOpenChange={(open) => !open && cancelDelete()}
        title="Eliminar unidad"
        description={
          itemToDelete
            ? `¿Estás seguro de eliminar la unidad ${itemToDelete.numero}? Esta acción no se puede deshacer desde la interfaz.`
            : ""
        }
        confirmText={isDeleting ? "ELIMINANDO..." : "ELIMINAR"}
        confirmButtonClassName="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        onConfirm={confirmDelete}
      />
    </CatalogLayout>
  );
};