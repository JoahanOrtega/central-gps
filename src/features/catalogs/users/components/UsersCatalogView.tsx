import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "../services/userService";
import type { UserListItem } from "../types/user.types";
import { UserCard } from "./UserCard";
import { CreateUserWizard } from "./CreateUserWizard/CreateUserWizard";
import { useAuthStore } from "@/stores/authStore";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { usePermiso } from "@/hooks/usePermiso";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { notify } from "@/stores/notificationStore";
import { queryKeys } from "@/lib/query-keys";
import {
  CatalogLayout,
  CatalogHeader,
  CatalogGrid,
  useDeleteConfirm,
} from "@/components/shared";

/**
 * Usa filtrado local (no debounce + query) porque la lista de usuarios
 * suele ser pequeña y no justifica una petición por búsqueda.
 */
export const UsersCatalogView = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const { idEmpresa, nombreEmpresa, isLoading: isLoadingEmpresa } = useEmpresaActiva();

  const [search, setSearch]           = useState("");
  const [wizardOpen, setWizardOpen]   = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);

  const puedeCrearUsuario      = usePermiso("usuarios.editar");
  const puedeEditarUsuario     = usePermiso("usuarios.editar");
  const puedeInhabilitarUsuario = usePermiso("usuarios.inhabilitar");

  const { data: users = [], isLoading, error, refetch } = useQuery<UserListItem[]>({
    queryKey: idEmpresa
      ? [...queryKeys.catalogs.users.list(), idEmpresa]
      : ["catalogs", "users", "no-empresa"],
    queryFn: ({ signal }) => userService.list(idEmpresa as number, signal),
    enabled: !!idEmpresa,
  });

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        u.usuario.toLowerCase().includes(q),
    );
  }, [users, search]);

  const showSkeleton = useDelayedLoading(isLoading);
  const errorMessage = error instanceof Error ? error.message : null;

  // Inhabilitar usa useDeleteConfirm aunque no sea un DELETE convencional —
  // el flujo (confirm → acción → notifica → invalida) es exactamente el mismo.
  const { itemToDelete: userToDisable, isDeleting: isDisabling, askDelete: askInhabilitar, cancelDelete: cancelInhabilitar, confirmDelete: confirmInhabilitar } =
    useDeleteConfirm<UserListItem>({
      deleteFn: async (user) => {
        await userService.inhabilitar(user.id, idEmpresa as number);
        await queryClient.invalidateQueries({ queryKey: queryKeys.catalogs.users.all });
      },
      successMessage: (user) => `${user.nombre} fue inhabilitado correctamente`,
      errorMessage: "No fue posible inhabilitar el usuario",
    });

  const handleCreate = () => {
    if (!idEmpresa) {
      notify.error("Selecciona una empresa antes de crear usuarios.");
      return;
    }
    setEditingUser(null);
    setWizardOpen(true);
  };

  const handleEdit = (user: UserListItem) => {
    if (!idEmpresa) {
      notify.error("Selecciona una empresa antes de editar usuarios.");
      return;
    }
    setEditingUser(user);
    setWizardOpen(true);
  };

  const handleWizardOpenChange = (open: boolean) => {
    setWizardOpen(open);
    if (!open) {
      // Pequeño delay para no mostrar el wizard vacío durante la animación de cierre
      setTimeout(() => setEditingUser(null), 250);
    }
  };

  const sinEmpresaSeleccionada = !isLoadingEmpresa && !idEmpresa;

  return (
    <CatalogLayout>
      <CatalogHeader
        icon={Users}
        title="Catálogo de Usuarios"
        subtitle={nombreEmpresa ? `· ${nombreEmpresa}` : undefined}
        search={search}
        onSearchChange={setSearch}
        onAdd={puedeCrearUsuario && idEmpresa ? handleCreate : undefined}
      />

      <div className="p-4 md:p-6">

        {/* Empresa cargando — caso fugaz, no vale la pena un skeleton completo */}
        {isLoadingEmpresa && (
          <div className="py-10 text-center text-sm text-slate-400">
            Cargando empresa...
          </div>
        )}

        {/* sudo_erp sin empresa seleccionada */}
        {sinEmpresaSeleccionada && (
          <EmptyState
            icon={Users}
            title="Selecciona una empresa"
            description="Para ver y administrar usuarios, selecciona una empresa desde el selector del navbar."
          />
        )}

        {/* Grid estándar — solo cuando hay empresa */}
        {idEmpresa && (
          <CatalogGrid
            isLoading={showSkeleton}
            errorMessage={errorMessage}
            items={filteredUsers}
            activeSearch={search.trim() ? search : undefined}
            renderItem={(user) => (
              <UserCard
                user={user}
                canEdit={puedeEditarUsuario}
                canInhabilitar={puedeInhabilitarUsuario}
                isSelf={currentUser?.sub ? Number(currentUser.sub) === user.id : false}
                onEdit={handleEdit}
                onInhabilitar={askInhabilitar}
              />
            )}
            keyExtractor={(user) => user.id}
            skeletonVariant="user"
            icon={Users}
            emptyTitle="No hay usuarios registrados"
            emptyDescription={
              puedeCrearUsuario
                ? `Crea el primer usuario para ${nombreEmpresa ?? "esta empresa"}.`
                : "Solicita a un administrador que cree los usuarios necesarios."
            }
            emptyActionLabel={puedeCrearUsuario ? "+ Nuevo usuario" : undefined}
            onEmptyAction={puedeCrearUsuario ? handleCreate : undefined}
            onRetry={refetch}
            onClearSearch={() => setSearch("")}
            searchEmptyTitle="Sin resultados"
          />
        )}
      </div>

      {idEmpresa !== null && (
        <CreateUserWizard
          open={wizardOpen}
          onOpenChange={handleWizardOpenChange}
          idEmpresa={idEmpresa}
          editingUser={editingUser}
        />
      )}

      <ConfirmDialog
        open={userToDisable !== null}
        onOpenChange={(open) => !open && cancelInhabilitar()}
        title="Inhabilitar usuario"
        description={
          userToDisable
            ? `¿Inhabilitar a ${userToDisable.nombre}? El usuario perderá el acceso al sistema, pero sus datos y permisos se conservarán por si se reactiva más adelante.`
            : ""
        }
        confirmText={isDisabling ? "INHABILITANDO..." : "INHABILITAR"}
        confirmButtonClassName="bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
        onConfirm={confirmInhabilitar}
      />
    </CatalogLayout>
  );
};