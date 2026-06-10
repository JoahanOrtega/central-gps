import { useState } from "react";
import { CalendarClock, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { usePermiso } from "@/hooks/usePermiso";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { queryKeys } from "@/lib/query-keys";
import {
    CatalogLayout,
    CatalogHeader,
    useDebounce,
    useDeleteConfirm,
    EmptyState,
    ErrorBanner,
    PoiCardSkeleton,
    ConfirmDialog
} from "@/components/shared";
import { itineraryService } from "./itineraryService";
import { ItineraryCard } from "./ItineraryCard";
import { NewItineraryModal } from "./NewItineraryModal";
import { EditItineraryModal } from "./EditItineraryModal";
import type { ItinerarioItem, ItinerarioGrupoRuta } from "./itinerary.types";

// ── Grupo colapsable por ruta ─────────────────────────────────────────────────

interface RuteGroupProps {
    grupo: ItinerarioGrupoRuta;
    canEdit: boolean;
    canDelete: boolean;
    onEdit: (id: number) => void;
    onDelete: (item: ItinerarioItem) => void;
}

const RuteGroup = ({
    grupo,
    canEdit,
    canDelete,
    onEdit,
    onDelete,
}: RuteGroupProps) => {
    const [open, setOpen] = useState(true);

    const total = grupo.itinerarios.length;

    return (
        <section className="border-b border-slate-100 last:border-b-0">
            {/* Cabecera del grupo — clickeable para colapsar */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-slate-50"
                aria-expanded={open}
            >
                <div className="flex items-center gap-3">
                    {open
                        ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                        : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    }
                    <div>
                        <span className="font-semibold text-slate-800">
                            {grupo.nombre_ruta}
                        </span>
                        {grupo.clave_ruta && (
                            <span className="ml-2 text-sm text-slate-400">
                                {grupo.clave_ruta}
                            </span>
                        )}
                    </div>
                    {grupo.cliente && (
                        <span className="hidden rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500 sm:block">
                            {grupo.cliente}
                        </span>
                    )}
                </div>
                <span className="shrink-0 text-sm text-slate-400">
                    {total} turno{total !== 1 ? "s" : ""}
                </span>
            </button>

            {/* Grid de itinerarios */}
            {open && (
                <div className="grid grid-cols-1 gap-4 px-6 pb-6 sm:grid-cols-2 xl:grid-cols-3">
                    {grupo.itinerarios.map((itin) => (
                        <ItineraryCard
                            key={itin.id_itinerario}
                            itinerario={itin}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

// ── Vista principal ───────────────────────────────────────────────────────────

export const ItinerariesCatalogView = () => {
    const queryClient = useQueryClient();
    const { idEmpresa } = useEmpresaActiva();

    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const debouncedSearch = useDebounce(search);

    const puedeCrear = usePermiso("itinerarios.editar");
    const puedeEditar = usePermiso("itinerarios.editar");
    const puedeEliminar = usePermiso("itinerarios.borrar");

    const { data: grupos = [], isLoading, error, refetch } =
        useQuery<ItinerarioGrupoRuta[]>({
            queryKey: queryKeys.operation.itineraries(idEmpresa, debouncedSearch),
            queryFn: () =>
                itineraryService.listGrouped(idEmpresa, debouncedSearch),
            enabled: !!idEmpresa,
        });

    const showSkeleton = useDelayedLoading(isLoading);
    const errorMessage = error instanceof Error ? error.message : null;

    // Total de itinerarios a través de todos los grupos
    const totalItinerarios = grupos.reduce(
        (acc, g) => acc + g.itinerarios.length,
        0,
    );

    const invalidate = () =>
        queryClient.invalidateQueries({
            queryKey: queryKeys.operation.itinerariesAll,
        });

    const { itemToDelete, isDeleting, askDelete, cancelDelete, confirmDelete } =
        useDeleteConfirm<ItinerarioItem>({
            deleteFn: async (itin) => {
                await itineraryService.delete(itin.id_itinerario, idEmpresa);
                await invalidate();
            },
            successMessage: (itin) =>
                `Turno "${itin.turno}" eliminado correctamente`,
        });

    return (
        <CatalogLayout>
            <CatalogHeader
                icon={CalendarClock}
                title="Catálogo de Itinerarios"
                subtitle={
                    totalItinerarios > 0
                        ? `${totalItinerarios} itinerario${totalItinerarios !== 1 ? "s" : ""} en ${grupos.length} ruta${grupos.length !== 1 ? "s" : ""}`
                        : undefined
                }
                search={search}
                onSearchChange={setSearch}
                onAdd={puedeCrear ? () => setModalOpen(true) : undefined}
            />

            <div className="flex-1">
                {/* Estados de carga y error */}
                {showSkeleton && (
                    <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <PoiCardSkeleton key={i} />
                        ))}
                    </div>
                )}

                {errorMessage && !showSkeleton && (
                    <div className="p-6">
                        <ErrorBanner message={errorMessage} onRetry={refetch} />
                    </div>
                )}

                {/* Sin resultados */}
                {!showSkeleton && !errorMessage && grupos.length === 0 && (
                    <EmptyState
                        icon={CalendarClock}
                        title={
                            debouncedSearch
                                ? "Sin resultados para tu búsqueda"
                                : "No hay itinerarios registrados"
                        }
                        description={
                            debouncedSearch
                                ? "Intenta con otro término o limpia la búsqueda."
                                : "Crea el primer itinerario para comenzar a programar los turnos de tus rutas."
                        }
                        actionLabel={
                            debouncedSearch
                                ? "Limpiar búsqueda"
                                : puedeCrear
                                    ? "+ Agregar itinerario"
                                    : undefined
                        }
                        onAction={
                            debouncedSearch
                                ? () => setSearch("")
                                : puedeCrear
                                    ? () => setModalOpen(true)
                                    : undefined
                        }
                        variant={debouncedSearch ? "search" : "empty"}
                    />
                )}

                {/* Grupos por ruta */}
                {!showSkeleton && !errorMessage && grupos.length > 0 &&
                    grupos.map((grupo) => (
                        <RuteGroup
                            key={grupo.id_ruta}
                            grupo={grupo}
                            canEdit={puedeEditar}
                            canDelete={puedeEliminar}
                            onEdit={setEditingId}
                            onDelete={askDelete}
                        />
                    ))
                }
            </div>

            {/* Modales */}
            <NewItineraryModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                onSuccess={() => {
                    setModalOpen(false);
                    invalidate();
                }}
            />

            <EditItineraryModal
                idItinerario={editingId}
                onClose={() => setEditingId(null)}
                onSuccess={() => {
                    setEditingId(null);
                    invalidate();
                }}
            />

            <ConfirmDialog
                open={itemToDelete !== null}
                onOpenChange={(open: boolean) => !open && cancelDelete()}
                title="Eliminar itinerario"
                description={
                    itemToDelete
                        ? `¿Estás seguro de eliminar el turno "${itemToDelete.turno}"? Esta acción no se puede deshacer.`
                        : ""
                }
                confirmText={isDeleting ? "ELIMINANDO..." : "ELIMINAR"}
                confirmButtonClassName="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                onConfirm={confirmDelete}
            />
        </CatalogLayout>
    );
};