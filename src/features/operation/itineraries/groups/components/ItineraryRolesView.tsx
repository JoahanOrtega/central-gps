import { useState } from "react";
import { CalendarRange, Clock, Pencil, Trash2, Users } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { usePermiso } from "@/hooks/usePermiso";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { useNotificationStore } from "@/stores/notificationStore";
import { queryKeys } from "@/lib/query-keys";
import {
    CatalogLayout, CatalogHeader, EmptyState, ErrorBanner,
    ConfirmDialog, KebabMenu, useDebounce, PoiCardSkeleton
} from "@/components/shared";
import { itineraryRoleService } from "../services/itineraryGroupService";
import { RoleFormModal } from "./RoleFormModal";
import type { ItineraryRole } from "../types/itinerary-group.types";

export const ItineraryRolesView = () => {
    const { idEmpresa } = useEmpresaActiva();
    const queryClient = useQueryClient();
    const notify = useNotificationStore((s) => s.addNotification);

    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<ItineraryRole | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ItineraryRole | null>(null);

    const debouncedSearch = useDebounce(search);
    const puedeEditar = usePermiso("itinerarios.grupos");
    const puedeBorrar = usePermiso("itinerarios.grupos");

    const { data: roles = [], isLoading, error, refetch } = useQuery<ItineraryRole[]>({
        queryKey: queryKeys.operation.itineraryRoles(idEmpresa, debouncedSearch),
        queryFn: () => itineraryRoleService.listRoles(idEmpresa, debouncedSearch),
        enabled: !!idEmpresa,
    });

    const showSkeleton = useDelayedLoading(isLoading);
    const errorMessage = error instanceof Error ? error.message : null;

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.operation.itineraryRolesAll });

    const deleteMutation = useMutation({
        mutationFn: () =>
            itineraryRoleService.deleteRole(deleteTarget!.id_rol_itinerarios, idEmpresa),
        onSuccess: () => {
            notify({ type: "success", message: `Rol "${deleteTarget?.nombre}" eliminado` });
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
                icon={CalendarRange}
                title="Roles de Itinerarios"
                subtitle={
                    roles.length > 0
                        ? `${roles.length} rol${roles.length !== 1 ? "es" : ""}`
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

                {!showSkeleton && !errorMessage && roles.length === 0 && (
                    <EmptyState
                        icon={CalendarRange}
                        title={debouncedSearch ? "Sin resultados" : "No hay roles creados"}
                        description={
                            debouncedSearch
                                ? "Intenta con otro término"
                                : "Los roles definen secuencias de turnos asignables a unidades."
                        }
                        actionLabel={!debouncedSearch && puedeEditar ? "+ Crear rol" : undefined}
                        onAction={!debouncedSearch && puedeEditar ? () => setFormOpen(true) : undefined}
                        variant={debouncedSearch ? "search" : "empty"}
                    />
                )}

                {!showSkeleton && !errorMessage && roles.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {roles.map((role) => (
                            <RoleCard
                                key={role.id_rol_itinerarios}
                                role={role}
                                canEdit={puedeEditar}
                                canDelete={puedeBorrar}
                                onEdit={() => setEditingRole(role)}
                                onDelete={() => setDeleteTarget(role)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <RoleFormModal
                open={formOpen}
                onOpenChange={setFormOpen}
                onSuccess={() => { setFormOpen(false); invalidate(); }}
            />

            <RoleFormModal
                open={!!editingRole}
                onOpenChange={(o) => !o && setEditingRole(null)}
                role={editingRole}
                onSuccess={() => { setEditingRole(null); invalidate(); }}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(o: boolean) => !o && setDeleteTarget(null)}
                title="Eliminar rol"
                description={
                    deleteTarget
                        ? `¿Eliminar el rol "${deleteTarget.nombre}"? Las asignaciones a unidades se cancelarán.`
                        : ""
                }
                confirmText={deleteMutation.isPending ? "ELIMINANDO..." : "ELIMINAR"}
                confirmButtonClassName="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                onConfirm={() => deleteMutation.mutate()}
            />
        </CatalogLayout>
    );
};

// ── Card de rol ───────────────────────────────────────────────────────────────

interface RoleCardProps {
    role: ItineraryRole;
    canEdit: boolean;
    canDelete: boolean;
    onEdit: () => void;
    onDelete: () => void;
}

const RoleCard = ({
    role, canEdit, canDelete, onEdit, onDelete,
}: RoleCardProps) => {
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
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-slate-800">
                            {role.nombre}
                        </h3>
                        {role.clave && (
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                {role.clave}
                            </span>
                        )}
                    </div>
                    {role.observaciones && (
                        <p className="mt-0.5 truncate text-xs text-slate-500">{role.observaciones}</p>
                    )}
                </div>
                {menuItems.length > 0 && (
                    <KebabMenu items={menuItems} entityName={role.nombre} />
                )}
            </div>

            {/* Timeline de días — visualización compacta del ciclo */}
            <div className="mt-4">
                <p className="mb-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Ciclo de {role.dias_duracion || "?"} días
                </p>
                <div className="flex gap-1 flex-wrap">
                    {Array.from({ length: Math.min(role.dias_duracion || 7, 14) }).map((_, i) => (
                        <div
                            key={i}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold bg-slate-100 text-slate-500"
                            title={`Día ${i + 1}`}
                        >
                            {i + 1}
                        </div>
                    ))}
                    {(role.dias_duracion || 0) > 14 && (
                        <div className="flex h-7 items-center px-2 text-xs text-slate-400">
                            +{role.dias_duracion - 14} más
                        </div>
                    )}
                </div>
            </div>

            {/* Métricas */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
                <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{role.total_itinerarios} turno{role.total_itinerarios !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>{role.total_asignaciones} asignación{role.total_asignaciones !== 1 ? "es" : ""}</span>
                </div>
                {role.fecha_inicio_rol && (
                    <div className="col-span-2 text-xs text-slate-400">
                        Desde {role.fecha_inicio_rol}
                    </div>
                )}
            </div>
        </article>
    );
};