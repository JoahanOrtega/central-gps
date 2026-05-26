import { useState } from "react";
import { Building2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clientService } from "./clientService";
import type { ClientItem } from "./client.types";
import { ClientCard } from "./ClientCard";
import { NewClientModal } from "./NewClientModal";
import { ClientAlertasModal } from "./ClientAlertasModal";
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

export const ClientsCatalogView = () => {
  const queryClient = useQueryClient();
  const { idEmpresa } = useEmpresaActiva();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // alertasClient guarda el cliente completo
  const [alertasClient, setAlertasClient] = useState<ClientItem | null>(null);

  const debouncedSearch = useDebounce(search);

  const puedeCrear = usePermiso("clientes.crear");
  const puedeEditar = usePermiso("clientes.editar");
  const puedeEliminar = usePermiso("clientes.eliminar");

  const { data: clients = [], isLoading, error, refetch } = useQuery<ClientItem[]>({
    queryKey: queryKeys.catalogs.clients(idEmpresa),
    queryFn: () => clientService.list(debouncedSearch, idEmpresa),
    enabled: !!idEmpresa,
  });

  const showSkeleton = useDelayedLoading(isLoading);
  const errorMessage = error instanceof Error ? error.message : null;

  const { itemToDelete, isDeleting, askDelete, cancelDelete, confirmDelete } =
    useDeleteConfirm<ClientItem>({
      deleteFn: async (client) => {
        await clientService.delete(client.id_cliente, idEmpresa);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.catalogs.clients(idEmpresa),
        });
      },
      successMessage: (client) => `Cliente "${client.nombre}" eliminado correctamente`,
    });

  return (
    <CatalogLayout>
      <CatalogHeader
        icon={Building2}
        title="Catálogo de Clientes"
        subtitle={
          clients.length > 0
            ? `${clients.length} cliente${clients.length !== 1 ? "s" : ""} registrado${clients.length !== 1 ? "s" : ""}`
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
          items={clients}
          activeSearch={debouncedSearch}
          renderItem={(client) => (
            <ClientCard
              client={client}
              canEdit={puedeEditar}
              canDelete={puedeEliminar}
              onEdit={(id) => console.log("Editar cliente", id)} // TODO: EditClientModal
              onDelete={askDelete}
              onAlertas={setAlertasClient}
            />
          )}
          keyExtractor={(client) => client.id_cliente}
          skeletonVariant="poi"
          icon={Building2}
          emptyTitle="No hay clientes registrados"
          emptyDescription="Agrega el primer cliente para comenzar a organizar tu cartera."
          emptyActionLabel="+ Agregar cliente"
          onEmptyAction={() => setModalOpen(true)}
          onRetry={refetch}
          onClearSearch={() => setSearch("")}
        />
      </div>

      <NewClientModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => {
          setModalOpen(false);
          queryClient.invalidateQueries({
            queryKey: queryKeys.catalogs.clients(idEmpresa),
          });
        }}
      />

      {/* Modal de alertas */}
      <ClientAlertasModal
        client={alertasClient}
        onClose={() => setAlertasClient(null)}
      />

      <ConfirmDialog
        open={itemToDelete !== null}
        onOpenChange={(open) => !open && cancelDelete()}
        title="Eliminar cliente"
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