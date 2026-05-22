import { useState } from "react";
import { Building2, Plus, Search, X } from "lucide-react";
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

const CLIENT_SKELETON_VARIANT = "poi" as const;

export const ClientsCatalogView = () => {
  const queryClient = useQueryClient();
  const { idEmpresa } = useEmpresaActiva();

  // Estados de UI
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // clientToDelete guarda el objeto completo (no solo el id) para que el
  // ConfirmDialog muestre el nombre del cliente antes de confirmar.
  const [clientToDelete, setClientToDelete] = useState<ClientItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permisos — el backend también valida, esto es solo UX
  const puedeCrear    = usePermiso("clientes.crear");
  const puedeEditar   = usePermiso("clientes.editar");
  const puedeEliminar = usePermiso("clientes.eliminar");

  // Debounce de búsqueda — 350ms, mismo valor que UnitsCatalogView
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(
      (handleSearchChange as unknown as { _t: ReturnType<typeof setTimeout> })._t,
    );
    (handleSearchChange as unknown as { _t: ReturnType<typeof setTimeout> })._t =
      setTimeout(() => setDebouncedSearch(value), 350);
  };

  // Query principal
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
    // No cerrar si está en medio de un DELETE
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
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
              <Building2 className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">
                Catálogo de Clientes
              </h1>
              <p className="text-sm text-slate-500">
                {clients.length > 0
                  ? `${clients.length} cliente${clients.length !== 1 ? "s" : ""} registrado${clients.length !== 1 ? "s" : ""}`
                  : "Sin clientes registrados"}
              </p>
            </div>
          </div>

          {/* Búsqueda + botón agregar */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none sm:w-64"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() => { setSearch(""); setDebouncedSearch(""); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {puedeCrear && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Agregar</span>
              </button>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 p-5">

          {errorMessage && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => refetch()}
                className="ml-4 font-medium underline hover:no-underline"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Esqueleto */}
          {showSkeleton && (
            <SkeletonGrid count={6} variant={CLIENT_SKELETON_VARIANT} />
          )}

          {/* Estado vacío */}
          {!showSkeleton && !errorMessage && clients.length === 0 && (
            <EmptyState
              icon={Building2}
              title={
                debouncedSearch
                  ? "Sin resultados para esa búsqueda"
                  : "Sin clientes registrados"
              }
              description={
                debouncedSearch
                  ? "Intenta con otro término de búsqueda."
                  : "Agrega el primer cliente con el botón de arriba."
              }
            />
          )}

          {!showSkeleton && clients.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

      {isCreateModalOpen && (
        <NewClientModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            queryClient.invalidateQueries({
              queryKey: queryKeys.catalogs.clients(idEmpresa),
            });
          }}
        />
      )}

      {/* Diálogo de confirmación */}
      <ConfirmDialog
        open={!!clientToDelete}
        onOpenChange={(open) => { if (!open) handleCancelDelete(); }}
        title="Eliminar cliente"
        description={
          clientToDelete
            ? `¿Estás seguro de que deseas eliminar a "${clientToDelete.nombre}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmButtonClassName="bg-red-600 text-white hover:bg-red-700"
        onConfirm={handleConfirmDelete}
      />
    </main>
  );
};