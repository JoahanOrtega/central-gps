import { useState } from "react";
import { UserRound } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { operatorService } from "./operatorService";
import type { OperatorItem } from "./operator.types";
import { OperatorCard } from "./OperatorCard";
// Los modales se construyen en la Entrega 6. Imports listos para activarse:
// import { NewOperatorModal } from "./NewOperatorModal";
// import { EditOperatorModal } from "./EditOperatorModal";
// import { AssignUnitModal } from "./AssignUnitModal";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { usePermiso } from "@/hooks/usePermiso";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { queryKeys } from "@/lib/query-keys";
import {
    CatalogLayout,
    CatalogHeader,
    CatalogGrid,
    useDebounce,
    useDeleteConfirm,
    usePagination,
    ConfirmDialog,
} from "@/components/shared";

export const OperatorsCatalogView = () => {
    const queryClient = useQueryClient();
    const { idEmpresa } = useEmpresaActiva();

    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingOperator, setEditingOperator] = useState<number | null>(null);
    const [assigningOperator, setAssigningOperator] = useState<OperatorItem | null>(null);

    const debouncedSearch = useDebounce(search);

    // El patrón de permisos de operadores usa "editar" para crear+editar
    // (no existe "operadores.crear", a diferencia de clientes).
    const puedeEditar = usePermiso("operadores.editar");
    const puedeEliminar = usePermiso("operadores.borrar");

    const {
        data: operators = [],
        isLoading,
        error,
        refetch,
    } = useQuery<OperatorItem[]>({
        queryKey: queryKeys.catalogs.operators(idEmpresa),
        queryFn: () => operatorService.list(debouncedSearch, idEmpresa),
        enabled: !!idEmpresa,
    });

    const { paginatedItems, pagination } = usePagination(operators, 10);

    const showSkeleton = useDelayedLoading(isLoading);
    const errorMessage = error instanceof Error ? error.message : null;

    const { itemToDelete, isDeleting, askDelete, cancelDelete, confirmDelete } =
        useDeleteConfirm<OperatorItem>({
            deleteFn: async (operator) => {
                await operatorService.delete(operator.id_operador, idEmpresa);
                await queryClient.invalidateQueries({
                    queryKey: queryKeys.catalogs.operators(idEmpresa),
                });
            },
            successMessage: (operator) =>
                `Operador "${operator.nombre}" eliminado correctamente`,
        });

    const invalidate = () =>
        queryClient.invalidateQueries({
            queryKey: queryKeys.catalogs.operators(idEmpresa),
        });

    return (
        <CatalogLayout>
            <CatalogHeader
                icon={UserRound}
                title="Catálogo de Operadores"
                subtitle={
                    operators.length > 0
                        ? `${operators.length} operador${operators.length !== 1 ? "es" : ""} registrado${operators.length !== 1 ? "s" : ""}`
                        : undefined
                }
                search={search}
                onSearchChange={setSearch}
                onAdd={puedeEditar ? () => setModalOpen(true) : undefined}
            />

            <div className="p-4 md:p-6">
                <CatalogGrid
                    isLoading={showSkeleton}
                    errorMessage={errorMessage}
                    items={paginatedItems}
                    pagination={pagination}
                    activeSearch={debouncedSearch}
                    renderItem={(operator) => (
                        <OperatorCard
                            operator={operator}
                            canEdit={puedeEditar}
                            canDelete={puedeEliminar}
                            onEdit={(id) => setEditingOperator(id)}
                            onDelete={askDelete}
                            onAssign={setAssigningOperator}
                        />
                    )}
                    keyExtractor={(operator) => operator.id_operador}
                    skeletonVariant="poi"
                    icon={UserRound}
                    emptyTitle="No hay operadores registrados"
                    emptyDescription="Agrega el primer operador para comenzar a gestionar a tus conductores."
                    emptyActionLabel="+ Agregar operador"
                    onEmptyAction={() => setModalOpen(true)}
                    onRetry={refetch}
                    onClearSearch={() => setSearch("")}
                />
            </div>

            {/* Modales — se activan en la Entrega 6.
      <NewOperatorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => { setModalOpen(false); invalidate(); }}
      />
      <EditOperatorModal
        idOperador={editingOperator}
        onClose={() => setEditingOperator(null)}
        onSuccess={() => { setEditingOperator(null); invalidate(); }}
      />
      <AssignUnitModal
        operator={assigningOperator}
        onClose={() => setAssigningOperator(null)}
        onSuccess={() => { setAssigningOperator(null); invalidate(); }}
      />
      */}

            <ConfirmDialog
                open={!!itemToDelete}
                onOpenChange={(open) => { if (!open) cancelDelete(); }}
                title="Eliminar operador"
                description={
                    itemToDelete
                        ? `¿Seguro que deseas eliminar a "${itemToDelete.nombre}"? Esta acción lo desactiva del catálogo.`
                        : ""
                }
                confirmText={isDeleting ? "ELIMINANDO..." : "ELIMINAR"}
                confirmButtonClassName="bg-red-600 text-white hover:bg-red-700"
                onConfirm={confirmDelete}
            />
        </CatalogLayout>

    );
};

