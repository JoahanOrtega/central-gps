import { useMemo, useState } from "react";
import { Users, Plus, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "../services/userService";
import type { UserListItem } from "../types/user.types";
import { UserCard } from "./UserCard";
import { useAuthStore } from "@/stores/authStore";
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
 * Responsabilidades:
 *   1. Cargar el listado vía TanStack Query (caché + refetch automático).
 *   2. Filtrar localmente por nombre/email (búsqueda).
 *   3. Mostrar permisos correctos: solo botón "Crear" si tiene
 *      'usuarios.editar', botones de cada card según corresponda.
 *   4. Orquestar el flujo de inhabilitar con ConfirmDialog.
 *
 * Lo que NO hace este archivo:
 *   - El wizard de crear/editar usuario (lo monta el padre — el wizard
 *     se entrega en el mensaje 4d).
 *
 * Por ahora el botón "+" mostrará un toast informando que el wizard
 * estará disponible en el siguiente mensaje. Esto se reemplaza en 4d
 * con la integración real.
 */
export const UsersCatalogView = () => {
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((s) => s.user);

    const [search, setSearch] = useState("");

    // Estado del confirm de inhabilitar.
    // Guardamos el usuario completo (no solo el id) para mostrar el nombre
    // en el dialog — Heurística #5: el usuario debe ver QUIÉN va a quedar
    // inhabilitado antes de confirmar.
    const [userToDisable, setUserToDisable] = useState<UserListItem | null>(null);
    const [isDisabling, setIsDisabling] = useState(false);

    // ── Permisos del usuario logueado ──────────────────────────────────────
    // Estos permisos se chequean en frontend para ocultar botones y
    // mejorar UX. El backend revalida cada operación con su propio
    // @permiso_required, así que esto es solo cosmético.
    const puedeCrearUsuario = usePermiso("usuarios.editar");
    const puedeEditarUsuario = usePermiso("usuarios.editar");
    const puedeInhabilitarUsuario = usePermiso("usuarios.inhabilitar");

    // ── Carga del listado ─────────────────────────────────────────────────
    // No incluimos id_empresa en la queryKey porque el backend lo toma
    // del JWT — al cambiar de empresa (sudo via switch) se invalida la
    // sesión completa y el caché se descarta automáticamente.
    const { data: users = [], isLoading, error, refetch } = useQuery<UserListItem[]>({
        queryKey: queryKeys.catalogs.users.list(),
        queryFn: ({ signal }) => userService.list(signal),
    });

    // ── Filtrado local ────────────────────────────────────────────────────
    // Filtramos en cliente porque:
    //   1. La cantidad de usuarios por empresa típicamente es < 100.
    //   2. Refrescar al servidor en cada keystroke sería innecesario.
    //   3. Tener el dataset cacheado permite filtrar en <1ms.
    //
    // Si en el futuro alguna empresa tiene miles de usuarios, conviene
    // mover el search al backend con debounce — pero hoy es prematuro.
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

    // ── Handlers ──────────────────────────────────────────────────────────

    // Por ahora el botón "+" solo notifica — la integración con el wizard
    // viene en el mensaje 4d. Marcamos esto con TODO para no perderlo.
    // TODO(4d): reemplazar con setIsCreateOpen(true) y montar el wizard.
    const handleCreate = () => {
        notify.info(
            "El wizard de creación se conectará en el siguiente paso del PR.",
        );
    };

    // Edición: igual que crear, conexión real al wizard en 4d.
    // TODO(4d): reemplazar con setEditingUser(user).
    const handleEdit = (user: UserListItem) => {
        notify.info(
            `El wizard de edición se conectará en el siguiente paso del PR. Usuario: ${user.nombre}`,
        );
    };

    // Inhabilitar: ESTE flujo SÍ está completamente conectado en 4c.
    // El de crear/editar requiere el wizard que viene en 4d.
    const handleAskInhabilitar = (user: UserListItem) => {
        setUserToDisable(user);
    };

    const handleCancelInhabilitar = () => {
        // No cerrar mientras está procesando — evitar que un click accidental
        // mientras spinea cierre el dialog y el usuario pierda contexto.
        if (!isDisabling) setUserToDisable(null);
    };

    const handleConfirmInhabilitar = async () => {
        if (!userToDisable) return;
        setIsDisabling(true);

        try {
            await userService.inhabilitar(userToDisable.id);

            // Invalidar la lista para que TanStack Query refetche
            // y el usuario inhabilitado desaparezca de la vista.
            // Usamos `.all` (no `.list()`) por si en el futuro hay
            // queries adicionales del módulo que también dependen.
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
            // NO cerrar el confirm en caso de error — el usuario decide si
            // reintentar o cancelar. Heurística #9: recuperarse de errores
            // manteniendo el contexto visible.
        } finally {
            setIsDisabling(false);
        }
    };

    // ── Estados derivados para render ─────────────────────────────────────
    const hasNoData = !isLoading && !errorMessage && users.length === 0;
    const hasNoResults =
        !isLoading && !errorMessage && users.length > 0 && filteredUsers.length === 0;
    const hasData = !isLoading && !errorMessage && filteredUsers.length > 0;

    return (
        <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
            <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {/* ── Cabecera con título + buscador + botón crear ────────────
                    Stack vertical en mobile, inline en desktop —
                    mismo patrón que los demás catálogos del proyecto. */}
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
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:flex-nowrap">
                            {/* Botón crear — solo si tiene permiso */}
                            {puedeCrearUsuario && (
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
                                    className="h-10 w-full min-w-0 rounded-r-lg px-3 text-sm outline-none sm:w-56"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Contenido principal: estados loading/error/empty/data ── */}
                <div className="p-4 md:p-6">
                    {showSkeleton && <SkeletonGrid variant="user" count={6} />}

                    {errorMessage && (
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
                                description="Crea el primer usuario para tu empresa."
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

            {/* ── Confirm de inhabilitar ──────────────────────────────────
                Mismo patrón que en UnitsCatalogView (PR 3). El nombre
                del usuario se incluye en la descripción para reforzar
                qué cuenta va a quedar inhabilitada. */}
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
                // Ámbar (no rojo) — inhabilitar es REVERSIBLE, distinto a un
                // DELETE definitivo. Comunicamos el "calor" del cambio con el
                // color: ámbar para reversibles, rojo para destructivos.
                confirmButtonClassName="bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                onConfirm={handleConfirmInhabilitar}
            />
        </main>
    );
};