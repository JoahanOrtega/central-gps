import { useState } from "react";
import { FolderOpen, Layers, Pencil, Trash2 } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { usePermiso } from "@/hooks/usePermiso";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { useNotificationStore } from "@/stores/notificationStore";
import { queryKeys } from "@/lib/query-keys";
import {
    CatalogLayout, CatalogHeader, EmptyState, ErrorBanner,
    ConfirmDialog, KebabMenu, useDebounce,
} from "@/components/shared";
import { PoiCardSkeleton } from "@/components/shared/SkeletonCard";
import { itineraryGroupService } from "../services/itineraryGroupService";
import { GroupFormModal } from "./GroupFormModal";
import { GroupTransferModal } from "./GroupTransferModal";
import type { ItineraryGroup } from "../types/itinerary-group.types";
export const ItineraryGroupsView = () => {
    const { idEmpresa } = useEmpresaActiva();
    const queryClient = useQueryClient();
    const notify = useNotificationStore((s) => s.addNotification);

    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<ItineraryGroup | null>(null);
    const [transferGroupId, setTransferGroupId] = useState<number | null>(null);

    // Cargar detalle del grupo cuando se selecciona para gestionar
    const { data: transferGroupDetail } = useQuery({
        queryKey: queryKeys.operation.itineraryGroupDetail(transferGroupId!, idEmpresa),
        queryFn: () => itineraryGroupService.getGroupById(transferGroupId!, idEmpresa),
        enabled: !!transferGroupId && !!idEmpresa,
    });
    const [deleteTarget, setDeleteTarget] = useState<ItineraryGroup | null>(null);

    const debouncedSearch = useDebounce(search);
    const puedeEditar = usePermiso("itinerarios.grupos");
    const puedeBorrar = usePermiso("itinerarios.grupos");

    const { data: groups = [], isLoading, error, refetch } = useQuery<ItineraryGroup[]>({
        queryKey: queryKeys.operation.itineraryGroups(idEmpresa, debouncedSearch),
        queryFn: () => itineraryGroupService.listGroups(idEmpresa, debouncedSearch),
        enabled: !!idEmpresa,
    });

    const showSkeleton = useDelayedLoading(isLoading);
    const errorMessage = error instanceof Error ? error.message : null;

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.operation.itineraryGroupsAll });

    const handleManageItineraries = (group: ItineraryGroup) => {
        setTransferGroupId(group.id_grupo_itinerarios);
    };

    const deleteMutation = useMutation({
        mutationFn: () =>
            itineraryGroupService.deleteGroup(deleteTarget!.id_grupo_itinerarios, idEmpresa),
        onSuccess: () => {
            notify({ type: "success", message: `Grupo "${deleteTarget?.nombre}" eliminado` });
            setDeleteTarget(null);
            invalidate();
        },
        onError: (err) => {
            notify({
                type: "error",
                message: err instanceof Error ? err.message : "Error al eliminar",
            });
        },
    });

    return (
        <CatalogLayout>
            <CatalogHeader
                icon={FolderOpen}
                title="Grupos de Itinerarios"
                subtitle={
                    groups.length > 0
                        ? `${groups.length} grupo${groups.length !== 1 ? "s" : ""}`
                        : undefined
                }
                search={search}
                onSearchChange={setSearch}
                onAdd={puedeEditar ? () => setFormOpen(true) : undefined}
            />

            <div className="flex-1 p-4 md:p-6">
                {showSkeleton && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 4 }).map((_, i) => <PoiCardSkeleton key={i} />)}
                    </div>
                )}

                {errorMessage && !showSkeleton && (
                    <ErrorBanner message={errorMessage} onRetry={refetch} />
                )}

                {!showSkeleton && !errorMessage && groups.length === 0 && (
                    <EmptyState
                        icon={FolderOpen}
                        title={debouncedSearch ? "Sin resultados" : "No hay grupos creados"}
                        description={
                            debouncedSearch
                                ? "Intenta con otro término"
                                : "Los grupos te permiten organizar itinerarios por categoría."
                        }
                        actionLabel={!debouncedSearch && puedeEditar ? "+ Crear grupo" : undefined}
                        onAction={!debouncedSearch && puedeEditar ? () => setFormOpen(true) : undefined}
                        variant={debouncedSearch ? "search" : "empty"}
                    />
                )}

                {!showSkeleton && !errorMessage && groups.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {groups.map((group) => (
                            <GroupCard
                                key={group.id_grupo_itinerarios}
                                group={group}
                                canEdit={puedeEditar}
                                canDelete={puedeBorrar}
                                onEdit={() => setEditingGroup(group)}
                                onDelete={() => setDeleteTarget(group)}
                                onManage={() => handleManageItineraries(group)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal crear */}
            <GroupFormModal
                open={formOpen}
                onOpenChange={setFormOpen}
                onSuccess={() => { setFormOpen(false); invalidate(); }}
            />

            {/* Modal editar */}
            <GroupFormModal
                open={!!editingGroup}
                onOpenChange={(o) => !o && setEditingGroup(null)}
                group={editingGroup}
                onSuccess={() => { setEditingGroup(null); invalidate(); }}
            />

            {/* Panel de transferencia dual */}
            <GroupTransferModal
                group={transferGroupDetail ?? null}
                onClose={() => { setTransferGroupId(null); invalidate(); }}
            />

            {/* Confirmar eliminar */}
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(o: boolean) => !o && setDeleteTarget(null)}
                title="Eliminar grupo"
                description={
                    deleteTarget
                        ? `¿Eliminar el grupo "${deleteTarget.nombre}"? Los itinerarios asignados no se borran.`
                        : ""
                }
                confirmText={deleteMutation.isPending ? "ELIMINANDO..." : "ELIMINAR"}
                confirmButtonClassName="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                onConfirm={() => deleteMutation.mutate()}
            />
        </CatalogLayout>
    );
};

// ── Card de grupo ─────────────────────────────────────────────────────────────

interface GroupCardProps {
    group: ItineraryGroup;
    canEdit: boolean;
    canDelete: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onManage: () => void;
}

const GroupCard = ({
    group, canEdit, canDelete, onEdit, onDelete, onManage,
}: GroupCardProps) => {
    const menuItems = [
        canEdit && {
            id: "edit", label: "Editar", icon: Pencil,
            onClick: onEdit,
        },
        canDelete && {
            id: "delete", label: "Eliminar", icon: Trash2,
            variant: "destructive" as const,
            onClick: onDelete,
        },
    ].filter(Boolean) as React.ComponentProps<typeof KebabMenu>["items"];

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50">
                        <FolderOpen className="h-5 w-5 text-sky-600" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-slate-800">
                            {group.nombre}
                        </h3>
                        {group.observaciones && (
                            <p className="truncate text-xs text-slate-500">{group.observaciones}</p>
                        )}
                    </div>
                </div>
                {menuItems.length > 0 && (
                    <KebabMenu items={menuItems} entityName={group.nombre} />
                )}
            </div>

            {/* Contador de itinerarios */}
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                <Layers className="h-4 w-4 text-slate-400" />
                <span>
                    {group.total_itinerarios} itinerario{group.total_itinerarios !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Botón gestionar itinerarios — la acción principal de la card */}
            <button
                type="button"
                onClick={onManage}
                className="mt-4 w-full rounded-lg border border-sky-200 bg-sky-50 py-2 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-100"
            >
                Gestionar itinerarios
            </button>
        </article>
    );
};