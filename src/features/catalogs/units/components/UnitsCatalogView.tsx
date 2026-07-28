import { useState } from "react";
import { BusFront, Download, TriangleAlert, X, FolderKanban } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { unitService } from "../services/unitService";
import type { UnitItem } from "../types/unit.types";
import { UnitCard } from "./UnitCard";
import { NewUnitModal } from "./NewUnitModal";
import { EditUnitModal } from "./EditUnitModal";
import { UnitTokenModal } from "./UnitTokenModal";
import { UnitGroupsModal } from "./UnitGroupsModal"; 
import { UnitDetailsModal } from "./UnitDetailsModal";
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
  const [detailsUnit, setDetailsUnit] = useState<UnitItem | null>(null);

  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("TODOS");

  const debouncedSearch = useDebounce(search);

  const puedeCrearUnidad = usePermiso("unidades.crear");
  const puedeEditarUnidad = usePermiso("unidades.editar");
  const puedeEliminarUnidad = usePermiso("unidades.eliminar");

  const { data: units = [], isLoading, error, refetch } = useQuery<UnitItem[]>({
    queryKey: queryKeys.units.list(idEmpresa, debouncedSearch),
    queryFn: () => unitService.getUnits(debouncedSearch, idEmpresa),
    enabled: !!idEmpresa,
  });

  const { data: groups = [] } = useQuery<any[]>({
    queryKey: ["unitGroups", idEmpresa],
    queryFn: () => unitService.listGroups("", idEmpresa).catch(() => []),
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

  const filteredUnits = units.filter((unit) => {
    if (activeTab === "TODOS") return true;
    if (activeTab === "SIN_GRUPO") return !unit.id_grupo_unidades || unit.id_grupo_unidades.length === 0;
    return unit.id_grupo_unidades?.includes(Number(activeTab));
  });

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

      <div className="border-b border-slate-200 px-4 py-4 md:px-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab("TODOS")}
            className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-colors uppercase ${
              activeTab === "TODOS"
                ? "border-blue-600 bg-blue-50 text-blue-600 font-bold"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Todas <span className={`ml-1 ${activeTab === "TODOS" ? "text-blue-400" : "text-slate-400"}`}>{units.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SIN_GRUPO")}
            className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-colors uppercase ${
              activeTab === "SIN_GRUPO"
                ? "border-blue-600 bg-blue-50 text-blue-600 font-bold"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Sin Grupo <span className={`ml-1 ${activeTab === "SIN_GRUPO" ? "text-blue-400" : "text-slate-400"}`}>
              {units.filter(u => !u.id_grupo_unidades || u.id_grupo_unidades.length === 0).length}
            </span>
          </button>

          {groups.map((g) => {
            const count = units.filter(u => u.id_grupo_unidades?.includes(Number(g.id_grupo_unidades))).length;
            return (
              <button
                key={g.id_grupo_unidades}
                type="button"
                onClick={() => setActiveTab(String(g.id_grupo_unidades))}
                className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-colors uppercase inline-flex items-center gap-2 ${
                  activeTab === String(g.id_grupo_unidades)
                    ? "border-blue-600 bg-blue-50 text-blue-600 font-bold"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {g.nombre}
                <span className={`ml-0.5 text-[10px] ${activeTab === String(g.id_grupo_unidades) ? "text-blue-400" : "text-slate-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsGroupsOpen(true)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm uppercase"
        >
          <FolderKanban className="h-4 w-4 text-slate-500" />
          Gestionar Grupos
        </button>
      </div>

      <div className="p-4 md:p-6">
        <CatalogGrid
          isLoading={showSkeleton}
          errorMessage={errorMessage}
          items={filteredUnits} 
          activeSearch={debouncedSearch}
          renderItem={(unit) => (
            <UnitCard
              unit={unit}
              canEdit={puedeEditarUnidad}
              canDelete={puedeEliminarUnidad}
              onEdit={(id) => setEditingUnitId(id)}
              onDelete={askDelete}
              onShowToken={(u) => setTokenUnit(u)}
              onShowDetails={(u) => setDetailsUnit(u)}
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
        key={`new-${groups.length}`} 
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreated={() => refetch()}
      />

      <EditUnitModal
        key={`edit-${groups.length}-${editingUnitId}`}
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

      <UnitDetailsModal
        unit={detailsUnit}
        groups={groups}
        onClose={() => setDetailsUnit(null)}
      />

      <UnitGroupsModal
        open={isGroupsOpen}
        onClose={() => setIsGroupsOpen(false)}
        units={units}
        groups={groups}
        onUpdateGroups={(updatedGroups) => {
          if (updatedGroups) {
            queryClient.setQueryData(["unitGroups", idEmpresa], updatedGroups);
          }
          queryClient.invalidateQueries(); 
        }}
        onUpdateUnits={() => refetch()}
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