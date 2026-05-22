import { useState } from "react";
import { Building2, Plus, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clientService } from "./clientService";
import type { ClientItem } from "./client.types";
import { ClientCard } from "./ClientCard";
import { NewClientModal } from "./NewClientModal";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { usePermiso } from "@/hooks/usePermiso";
import { SkeletonGrid } from "@/components/shared/SkeletonCard";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { notify } from "@/stores/notificationStore";
import { queryKeys } from "@/lib/query-keys";

export const ClientsCatalogView = () => {
  const queryClient = useQueryClient();
  const { idEmpresa } = useEmpresaActiva();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permisos
  const puedeCrear    = usePermiso("clientes.crear");
  const puedeEditar   = usePermiso("clientes.editar");
  const puedeEliminar = usePermiso("clientes.eliminar");

  // Debounce de 350ms
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(
      (handleSearchChange as unknown as { _t: ReturnType<typeof setTimeout> })._t,
    );
    (handleSearchChange as unknown as { _t: ReturnType<typeof setTimeout> })._t =
      setTimeout(() => setDebouncedSearch(value), 350);
  };

  const {
    data: clients = [],
    isLoading,
    error,
    refetch,
  } = useQuery<ClientItem[]>({
    queryKey: queryKeys.catalogs.clients(idEmpresa),
    queryFn: () => clientService.list(debouncedSearch, idEmpresa),
    enabled: !!idEmpresa,
  });

  const showSkeleton = useDelayedLoading(isLoading);
  const errorMessage = error instanceof Error ? error.message : null;

  // Handlers de eliminación
  const handleAskDelete = (client: ClientItem) => setClientToDelete(client);

  const handleCancelDelete = () => {
    if (!isDeleting) setClientToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      await clientService.delete(clientToDelete.id_cliente, idEmpresa);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.catalogs.clients(idEmpresa),
      });
      notify.success(`Cliente "${clientToDelete.nombre}" eliminado correctamente`);
      setClientToDelete(null);
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : "No fue posible eliminar el cliente",
      );
      // NO cerramos el confirm en error — el usuario decide si reintentar o cancelar
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
      <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">

        {/* Encabezado */}
        <div className="border-b border-slate-200 px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-slate-500" />
              <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">
                Catálogo de Clientes
              </h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Botón agregar */}
              {puedeCrear && (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex h-10 w-full items-center justify-center rounded-lg border border-emerald-400 bg-white text-emerald-500 hover:bg-emerald-50 sm:w-12"
                  title="Agregar cliente"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}

              {/* Campo de busqueda */}
              <div className="flex w-full items-center rounded-lg border border-slate-300 bg-white sm:w-auto">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-r border-slate-300 text-emerald-500">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="buscar..."
                  aria-label="Buscar clientes"
                  className="h-10 w-full min-w-0 rounded-r-lg px-3 text-sm outline-none sm:w-56"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-4 md:p-6">

          {/* Skeleton */}
          {showSkeleton && <SkeletonGrid variant="poi" count={6} />}

          {/* Estado de error */}
          {errorMessage && (
            <EmptyState
              icon={Building2}
              title="No se pudieron cargar los clientes"
              description={errorMessage}
              actionLabel="Reintentar"
              onAction={() => refetch()}
              variant="error"
            />
          )}

          {/* Estado vacío — diferencia entre sin datos y sin resultados */}
          {!showSkeleton && !errorMessage && clients.length === 0 && (
            debouncedSearch ? (
              <EmptyState
                icon={Building2}
                title="Sin resultados"
                description={`No se encontraron clientes que coincidan con "${debouncedSearch}".`}
                actionLabel="Limpiar búsqueda"
                onAction={() => { setSearch(""); setDebouncedSearch(""); }}
                variant="search"
              />
            ) : (
              <EmptyState
                icon={Building2}
                title="No hay clientes registrados"
                description="Agrega el primer cliente para comenzar a organizar tu cartera."
                actionLabel="+ Agregar cliente"
                onAction={() => setIsCreateModalOpen(true)}
              />
            )
          )}

          {/* Grid de cards */}
          {!showSkeleton && !errorMessage && clients.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:gap-6 2xl:grid-cols-2">
              {clients.map((client) => (
                <ClientCard
                  key={client.id_cliente}
                  client={client}
                  canEdit={puedeEditar}
                  canDelete={puedeEliminar}
                  onEdit={(id) => {
                    // TODO: abrir EditClientModal
                    console.log("Editar cliente", id);
                  }}
                  onDelete={handleAskDelete}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <NewClientModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          queryClient.invalidateQueries({
            queryKey: queryKeys.catalogs.clients(idEmpresa),
          });
        }}
      />

      {/* Confirm de eliminación */}
      <ConfirmDialog
        open={clientToDelete !== null}
        onOpenChange={(open) => !open && handleCancelDelete()}
        title="Eliminar cliente"
        description={
          clientToDelete
            ? `¿Estás seguro de eliminar "${clientToDelete.nombre}"? Esta acción no se puede deshacer desde la interfaz.`
            : ""
        }
        confirmText={isDeleting ? "ELIMINANDO..." : "ELIMINAR"}
        confirmButtonClassName="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        onConfirm={handleConfirmDelete}
      />
    </main>
  );
};