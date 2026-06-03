import { useState } from "react";
import { Route as RouteIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { routeService } from "./routeService";
import type { RouteItem } from "./route.types";
import { RouteCard } from "./RouteCard";
import { NewRouteModal } from "./NewRouteModal";
import { EditRouteModal } from "./EditRouteModal";
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

export const RoutesCatalogView = () => {
    const queryClient = useQueryClient();
    const { idEmpresa } = useEmpresaActiva();

    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRuta, setEditingRuta] = useState<number | null>(null);

    const debouncedSearch = useDebounce(search);

    const puedeCrear = usePermiso("rutas.crear");
    const puedeEditar = usePermiso("rutas.editar");
    const puedeEliminar = usePermiso("rutas.eliminar");

    const { data: routes = [], isLoading, error, refetch } = useQuery<RouteItem[]>({
        queryKey: queryKeys.operation.routes(idEmpresa, debouncedSearch),
        queryFn: () => routeService.list(debouncedSearch, idEmpresa),
        enabled: !!idEmpresa,
    });

    const showSkeleton = useDelayedLoading(isLoading);
    const errorMessage = error instanceof Error ? error.message : null;

    const { itemToDelete, isDeleting, askDelete, cancelDelete, confirmDelete } =
        useDeleteConfirm<RouteItem>({
            deleteFn: async (route) => {
                await routeService.delete(route.id_ruta, idEmpresa);
                await queryClient.invalidateQueries({
                    queryKey: queryKeys.operation.routesAll,
                });
            },
            successMessage: (route) => `Ruta "${route.nombre}" eliminada correctamente`,
        });

    return (
        <CatalogLayout>
            <CatalogHeader
                icon={RouteIcon}
                title="Catálogo de Rutas"
                subtitle={
                    routes.length > 0
                        ? `${routes.length} ruta${routes.length !== 1 ? "s" : ""} registrada${routes.length !== 1 ? "s" : ""}`
                        : undefined
                }
                search={search}
                onSearchChange={setSearch}
                onAdd={puedeCrear ? () => setModalOpen(true) : undefined}
            />

            <div className="p-4 md:p-6">
                <CatalogGrid
                    isLoading={showSkeleton}
                    errorMessage={errorMessage}
                    items={routes}
                    activeSearch={debouncedSearch}
                    renderItem={(route) => (
                        <RouteCard
                            route={route}
                            canEdit={puedeEditar}
                            canDelete={puedeEliminar}
                            onEdit={(id) => setEditingRuta(id)}
                            onDelete={askDelete}
                        />
                    )}
                    keyExtractor={(route) => route.id_ruta}
                    skeletonVariant="poi"
                    icon={RouteIcon}
                    emptyTitle="No hay rutas registradas"
                    emptyDescription="Crea la primera ruta o impórtala desde un archivo KML."
                    emptyActionLabel="+ Agregar ruta"
                    onEmptyAction={() => setModalOpen(true)}
                    onRetry={refetch}
                    onClearSearch={() => setSearch("")}
                />
            </div>

            <NewRouteModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                onSuccess={() => {
                    setModalOpen(false);
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.operation.routesAll,
                    });
                }}
            />

            <EditRouteModal
                idRuta={editingRuta}
                onClose={() => setEditingRuta(null)}
                onSuccess={() => {
                    setEditingRuta(null);
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.operation.routesAll,
                    });
                }}
            />

            <ConfirmDialog
                open={itemToDelete !== null}
                onOpenChange={(open) => !open && cancelDelete()}
                title="Eliminar ruta"
                description={
                    itemToDelete
                        ? `¿Estás seguro de eliminar "${itemToDelete.nombre}"? Esta acción no se puede deshacer.`
                        : ""
                }
                confirmText={isDeleting ? "ELIMINANDO..." : "ELIMINAR"}
                confirmButtonClassName="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                onConfirm={confirmDelete}
            />
        </CatalogLayout>
    );
};