import { useMemo, useState } from "react";
import { Users, Plus, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "../services/userService";
import type { UserListItem } from "../types/user.types";
import { UserCard } from "./UserCard";
import { CreateUserWizard } from "./CreateUserWizard/CreateUserWizard";
import { useAuthStore } from "@/stores/authStore";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { usePermiso } from "@/hooks/usePermiso";
import { SkeletonGrid } from "@/components/shared/SkeletonCard";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { notify } from "@/stores/notificationStore";
import { queryKeys } from "@/lib/query-keys";

/**
 * Vista principal del módulo Catálogos > Usuarios.
 *
 * Patrón id_empresa: usa useEmpresaActiva() — el mismo hook que
 * UnitsCatalogView. Esto resuelve el id de tres maneras:
 *   - admin_empresa / usuario: viene del JWT (siempre la misma empresa).
 *   - sudo_erp con empresa seleccionada en el selector del navbar:
 *     viene del companyStore.
 *   - sudo_erp sin empresa seleccionada (modo "Particular"): null →
 *     se muestra EmptyState pidiendo seleccionar empresa.
 *
 * El service pasa idEmpresa como query param a todos los endpoints
 * de /catalogs/users/* — el backend acepta este patrón (mismo que
 * /catalogs/operators y /catalogs/unit-groups).
 */
export const UsersCatalogView = () => {
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((s) => s.user);
    const { idEmpresa, nombreEmpresa, isLoading: isLoadingEmpresa } = useEmpresaActiva();

    const [search, setSearch] = useState("");

    // ── Estado del wizard (creación + edición) ──────────────────────────
    const [wizardOpen, setWizardOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserListItem | null>(null);

    // ── Estado del confirm de inhabilitar ───────────────────────────────
    const [userToDisable, setUserToDisable] = useState<UserListItem | null>(null);
    const [isDisabling, setIsDisabling] = useState(false);

    // ── Permisos del usuario logueado ───────────────────────────────────
    const puedeCrearUsuario = usePermiso("usuarios.editar");
    const puedeEditarUsuario = usePermiso("usuarios.editar");
    const puedeInhabilitarUsuario = usePermiso("usuarios.inhabilitar");

    // ── Carga del listado ──────────────────────────────────────────────
    // enabled: !!idEmpresa evita que la query se dispare con null —
    // mismo patrón que UnitsCatalogView. Cuando el sudo_erp cambia de
    // empresa en el selector del navbar, idEmpresa cambia, la queryKey
    // cambia, y TanStack Query refetcha automáticamente.
    const {
        data: users = [],
        isLoading,
        error,
        refetch,
    } = useQuery<UserListItem[]>({
        queryKey: idEmpresa
            ? [...queryKeys.catalogs.users.list(), idEmpresa]
            : ["catalogs", "users", "no-empresa"],
        queryFn: ({ signal }) => userService.list(idEmpresa as number, signal),
        enabled: !!idEmpresa,
    });

    // ── Filtrado local ─────────────────────────────────────────────────
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

    // ── Handlers de creación / edición ──────────────────────────────────

    const handleCreate = () => {
        if (!idEmpresa) {
            notify.error(
                "Selecciona una empresa antes de crear usuarios.",
            );
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
            // Pequeño retraso para evitar parpadeo durante la animación
            // de cierre del modal.
            setTimeout(() => setEditingUser(null), 250);
        }
    };

    // ── Handlers de inhabilitar ─────────────────────────────────────────

    const handleAskInhabilitar = (user: UserListItem) => {
        setUserToDisable(user);
    };

    const handleCancelInhabilitar = () => {
        if (!isDisabling) setUserToDisable(null);
    };

    const handleConfirmInhabilitar = async () => {
        if (!userToDisable || !idEmpresa) return;
        setIsDisabling(true);

        try {
            await userService.inhabilitar(userToDisable.id, idEmpresa);

            await queryClient.invalidateQueries({
                queryKey: queryKeys.catalogs.users.all,
            });

            notify.success(
                `${userToDisable.nombre} fue inhabilitado correctamente`,
            );
            setUserToDisable(null);
        } catch (err) {
            notify.error(
                err instanceof Error
                    ? err.message
                    : "No fue posible inhabilitar el usuario",
            );
        } finally {
            setIsDisabling(false);
        }
    };

    // ── Estados derivados para render ───────────────────────────────────
    // Ojo con el orden de prioridad — del más bloqueante al más específico:
    //   1. isLoadingEmpresa → empresa aún cargando (caso fugaz)
    //   2. !idEmpresa       → sudo sin empresa seleccionada
    //   3. errorMessage     → fallo de red/backend
    //   4. hasNoData        → backend OK pero lista vacía
    //   5. hasNoResults     → hay datos pero el filtro no encontró nada
    //   6. hasData          → render normal
    const sinEmpresaSeleccionada = !isLoadingEmpresa && !idEmpresa;
    const hasNoData =
        idEmpresa && !isLoading && !errorMessage && users.length === 0;
    const hasNoResults =
        idEmpresa &&
        !isLoading &&
        !errorMessage &&
        users.length > 0 &&
        filteredUsers.length === 0;
    const hasData =
        idEmpresa && !isLoading && !errorMessage && filteredUsers.length > 0;

    return (
        <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
            <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {/* ── Cabecera ────────────────────────────────────────── */}
                <div className="border-b border-slate-200 px-4 py-4 md:px-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-center gap-3">
                            <Users
                                className="h-5 w-5 text-slate-500"
                                aria-hidden="true"
                            />
                            <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">
                                Catálogo de Usuarios
                            </h1>
                            {/* Sub-título con el nombre de la empresa activa.
                                Heurística #1: el usuario debe saber en qué
                                empresa está operando — crítico cuando el
                                sudo_erp cambia entre empresas. */}
                            {nombreEmpresa && (
                                <span className="hidden text-sm text-slate-400 md:inline">
                                    · {nombreEmpresa}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:flex-nowrap">
                            {/* Botón crear — solo si tiene permiso Y hay empresa.
                                Sin empresa, ocultarlo evita que el usuario lo
                                clickee y reciba un mensaje de error confuso. */}
                            {puedeCrearUsuario && idEmpresa && (
                                <button
                                    type="button"
                                    onClick={handleCreate}
                                    className="flex h-10 w-full items-center justify-center rounded-lg border border-emerald-400 bg-white text-emerald-500 hover:bg-emerald-50 sm:w-12"
                                    title="Nuevo usuario"
                                    aria-label="Nuevo usuario"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            )}

                            {/* Buscador */}
                            <div className="flex w-full items-center rounded-lg border border-slate-300 bg-white sm:w-auto">
                                <div
                                    className="flex h-10 w-10 shrink-0 items-center justify-center border-r border-slate-300 text-emerald-500"
                                    aria-hidden="true"
                                >
                                    <Search className="h-4 w-4" />
                                </div>
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="buscar..."
                                    aria-label="Buscar usuario por nombre o email"
                                    disabled={!idEmpresa}
                                    className="h-10 w-full min-w-0 rounded-r-lg px-3 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 sm:w-56"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Contenido principal ───────────────────────────── */}
                <div className="p-4 md:p-6">
                    {/* Loading inicial mientras se resuelve la empresa activa */}
                    {isLoadingEmpresa && (
                        <div className="py-10 text-center text-sm text-slate-400">
                            Cargando empresa...
                        </div>
                    )}

                    {/* Sudo_erp sin empresa seleccionada — guía clara al
                        selector del navbar. Heurística #6: reconocer en
                        lugar de recordar. */}
                    {sinEmpresaSeleccionada && (
                        <EmptyState
                            icon={Users}
                            title="Selecciona una empresa"
                            description="Para ver y administrar usuarios, selecciona una empresa desde el selector del navbar (esquina superior derecha)."
                        />
                    )}

                    {idEmpresa && showSkeleton && (
                        <SkeletonGrid variant="user" count={6} />
                    )}

                    {idEmpresa && errorMessage && (
                        <EmptyState
                            icon={Users}
                            title="No se pudieron cargar los usuarios"
                            description={errorMessage}
                            actionLabel="Reintentar"
                            onAction={() => refetch()}
                        />
                    )}

                    {hasNoData &&
                        (puedeCrearUsuario ? (
                            <EmptyState
                                icon={Users}
                                title="No hay usuarios registrados"
                                description={`Crea el primer usuario para ${nombreEmpresa ?? "esta empresa"}.`}
                                actionLabel="+ Nuevo usuario"
                                onAction={handleCreate}
                            />
                        ) : (
                            <EmptyState
                                icon={Users}
                                title="No hay usuarios registrados"
                                description="Solicita a un administrador que cree los usuarios necesarios."
                            />
                        ))}

                    {hasNoResults && (
                        <EmptyState
                            icon={Users}
                            title="Sin resultados"
                            description={`No se encontraron usuarios que coincidan con "${search}".`}
                            actionLabel="Limpiar búsqueda"
                            onAction={() => setSearch("")}
                        />
                    )}

                    {hasData && (
                        <div className="grid grid-cols-1 gap-4 md:gap-6 2xl:grid-cols-2">
                            {filteredUsers.map((user) => (
                                <UserCard
                                    key={user.id}
                                    user={user}
                                    canEdit={puedeEditarUsuario}
                                    canInhabilitar={puedeInhabilitarUsuario}
                                    isSelf={
                                        currentUser?.sub
                                            ? Number(currentUser.sub) === user.id
                                            : false
                                    }
                                    onEdit={handleEdit}
                                    onInhabilitar={handleAskInhabilitar}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ── Wizard de creación / edición ────────────────────────── */}
            {idEmpresa !== null && (
                <CreateUserWizard
                    open={wizardOpen}
                    onOpenChange={handleWizardOpenChange}
                    idEmpresa={idEmpresa}
                    editingUser={editingUser}
                />
            )}

            {/* ── Confirm de inhabilitar ───────────────────────────── */}
            <ConfirmDialog
                open={userToDisable !== null}
                onOpenChange={(open) => !open && handleCancelInhabilitar()}
                title="Inhabilitar usuario"
                description={
                    userToDisable
                        ? `¿Inhabilitar a ${userToDisable.nombre}? El usuario perderá el acceso al sistema, pero sus datos y permisos se conservarán por si se reactiva más adelante.`
                        : ""
                }
                confirmText={isDisabling ? "INHABILITANDO..." : "INHABILITAR"}
                confirmButtonClassName="bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                onConfirm={handleConfirmInhabilitar}
            />
        </main>
    );
};