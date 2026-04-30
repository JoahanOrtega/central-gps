import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
    X, Save, ChevronDown, ChevronRight, CheckSquare, Square, Loader2,
} from "lucide-react";
import {
    getUserPermissions,
    updateUserPermissions,
} from "../services/erpService";
import type {
    UsuarioConPermisos,
    PermisoUsuarioItem,
} from "../types/erp.types";
import { queryKeys } from "@/lib/query-keys";

// ═════════════════════════════════════════════════════════════════════════════
// Tipos locales
// ═════════════════════════════════════════════════════════════════════════════
interface Props {
    usuario: UsuarioConPermisos;
    /**
     * Callback al cerrar el modal.
     * @param huboCambios - true si se guardaron cambios exitosamente.
     */
    onClose: (huboCambios?: boolean) => void;
}

// Permisos agrupados por módulo (estructura intermedia para el render).
type GrupoModulo = {
    modulo: string;
    permisos: PermisoUsuarioItem[];
};

// ═════════════════════════════════════════════════════════════════════════════
// Componente
// ═════════════════════════════════════════════════════════════════════════════
export const PermissionsEditModal = ({ usuario, onClose }: Props) => {
    const queryClient = useQueryClient();

    // ── Set local de permisos seleccionados (claves) ──────────────────────
    // Usamos Set en lugar de array para que add/remove sean O(1).
    // Se inicializa cuando llegan los datos del backend.
    const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
    const [inicializado, setInicializado] = useState(false);

    // ── Módulos expandidos en el accordion ────────────────────────────────
    // Inicialmente todos colapsados — el usuario abre los que le interesan.
    const [modulosAbiertos, setModulosAbiertos] = useState<Set<string>>(
        new Set(),
    );

    // ── Carga de los permisos del usuario ─────────────────────────────────
    const {
        data: permisos = [],
        isLoading,
        error,
    } = useQuery<PermisoUsuarioItem[]>({
        queryKey: queryKeys.erp.userPermissionsDetail(
            usuario.id_usuario,
            usuario.id_empresa,
        ),
        queryFn: () =>
            getUserPermissions(usuario.id_usuario, usuario.id_empresa),
    });

    // ── Inicializar seleccionados cuando llegan los datos ─────────────────
    // Se ejecuta una sola vez por carga — no queremos reset al refetchear.
    useEffect(() => {
        if (!inicializado && permisos.length > 0) {
            const set = new Set<string>();
            permisos.forEach((p) => {
                if (p.asignado) set.add(p.clave);
            });
            setSeleccionados(set);
            setInicializado(true);
        }
    }, [permisos, inicializado]);

    // ── Agrupación por módulo (para el accordion) ─────────────────────────
    const grupos = useMemo<GrupoModulo[]>(() => {
        const map = new Map<string, PermisoUsuarioItem[]>();
        permisos.forEach((p) => {
            if (!map.has(p.modulo)) map.set(p.modulo, []);
            map.get(p.modulo)!.push(p);
        });

        // Convertir a array ordenado por nombre de módulo
        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([modulo, permisos]) => ({ modulo, permisos }));
    }, [permisos]);

    // ── Detectar cambios respecto al estado inicial ───────────────────────
    // Compara las claves originales (asignadas en BD) vs las del Set local.
    const hayCambios = useMemo(() => {
        if (!inicializado) return false;
        const originales = new Set(
            permisos.filter((p) => p.asignado).map((p) => p.clave),
        );
        if (originales.size !== seleccionados.size) return true;
        for (const clave of seleccionados) {
            if (!originales.has(clave)) return true;
        }
        return false;
    }, [permisos, seleccionados, inicializado]);

    // ── Mutación de guardar ───────────────────────────────────────────────
    const guardarMutation = useMutation({
        mutationFn: () =>
            updateUserPermissions(usuario.id_usuario, {
                id_empresa: usuario.id_empresa,
                permisos: Array.from(seleccionados),
            }),
        onSuccess: () => {
            // Invalidar queries para refrescar la tabla principal y el detalle
            queryClient.invalidateQueries({
                queryKey: queryKeys.erp.usersPermissions(),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.erp.userPermissionsDetail(
                    usuario.id_usuario,
                    usuario.id_empresa,
                ),
            });
            onClose(true);
        },
    });

    // ── Helpers de UI ────────────────────────────────────────────────────
    const togglePermiso = (clave: string) => {
        setSeleccionados((prev) => {
            const next = new Set(prev);
            if (next.has(clave)) next.delete(clave);
            else next.add(clave);
            return next;
        });
    };

    const toggleModulo = (modulo: string) => {
        setModulosAbiertos((prev) => {
            const next = new Set(prev);
            if (next.has(modulo)) next.delete(modulo);
            else next.add(modulo);
            return next;
        });
    };

    /**
     * Marcar/desmarcar TODOS los permisos de un módulo a la vez.
     * Heurística #7 (Flexibilidad): atajos para acciones comunes.
     */
    const toggleModuloCompleto = (
        e: React.MouseEvent,
        grupo: GrupoModulo,
    ) => {
        e.stopPropagation(); // que no abra/cierre el accordion

        const todasMarcadas = grupo.permisos.every((p) =>
            seleccionados.has(p.clave),
        );

        setSeleccionados((prev) => {
            const next = new Set(prev);
            grupo.permisos.forEach((p) => {
                if (todasMarcadas) next.delete(p.clave);
                else next.add(p.clave);
            });
            return next;
        });
    };

    // Marcar/desmarcar TODOS del catálogo
    const toggleTodos = () => {
        const todasMarcadas = permisos.every((p) =>
            seleccionados.has(p.clave),
        );

        setSeleccionados(() => {
            if (todasMarcadas) return new Set();
            return new Set(permisos.map((p) => p.clave));
        });
    };

    // ── Cerrar con confirmación si hay cambios sin guardar ────────────────
    // Heurística #5 (Prevención de errores): evitar perder trabajo por accidente.
    const handleCerrar = () => {
        if (hayCambios) {
            const confirmar = window.confirm(
                "Tienes cambios sin guardar. ¿Seguro que quieres cerrar?",
            );
            if (!confirmar) return;
        }
        onClose(false);
    };

    // ── Cerrar con tecla Escape ──────────────────────────────────────────
    // Heurística #7 (Atajos para usuarios expertos).
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleCerrar();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hayCambios]);

    const totalSeleccionados = seleccionados.size;
    const totalCatalogo = permisos.length;
    const errorMessage = error instanceof Error ? error.message : null;
    const errorGuardar =
        guardarMutation.error instanceof Error
            ? guardarMutation.error.message
            : null;

    return (
        // Backdrop con click-to-close
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onClick={handleCerrar}
        >
            {/* Modal — stopPropagation para que el click dentro no cierre */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                {/* ═══════════ HEADER ═══════════ */}
                <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            Editar permisos
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                            <span className="font-medium text-slate-700">
                                {usuario.nombre}
                            </span>{" "}
                            · {usuario.empresa}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleCerrar}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* ═══════════ TOOLBAR ═══════════ */}
                {!isLoading && !errorMessage && (
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3">
                        <p className="text-xs text-slate-600">
                            <span className="font-mono font-semibold text-slate-800">
                                {totalSeleccionados}
                            </span>{" "}
                            de{" "}
                            <span className="font-mono text-slate-500">
                                {totalCatalogo}
                            </span>{" "}
                            permisos seleccionados
                        </p>
                        <button
                            type="button"
                            onClick={toggleTodos}
                            className="text-xs text-emerald-600 hover:underline"
                        >
                            {totalSeleccionados === totalCatalogo
                                ? "Deseleccionar todos"
                                : "Seleccionar todos"}
                        </button>
                    </div>
                )}

                {/* ═══════════ CONTENIDO ═══════════ */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {isLoading && (
                        <div className="flex items-center justify-center py-10 text-slate-500">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cargando permisos...
                        </div>
                    )}
                    {errorMessage && (
                        <div className="py-10 text-center text-red-500">
                            {errorMessage}
                        </div>
                    )}
                    {!isLoading && !errorMessage && grupos.length === 0 && (
                        <p className="py-10 text-center text-slate-400">
                            No hay permisos en el catálogo
                        </p>
                    )}
                    {!isLoading && !errorMessage && grupos.length > 0 && (
                        <div className="space-y-2">
                            {grupos.map((grupo) => {
                                const abierto = modulosAbiertos.has(grupo.modulo);
                                const totalGrupo = grupo.permisos.length;
                                const seleccionadosGrupo = grupo.permisos.filter(
                                    (p) => seleccionados.has(p.clave),
                                ).length;
                                const todosGrupoMarcados =
                                    seleccionadosGrupo === totalGrupo;

                                return (
                                    <div
                                        key={grupo.modulo}
                                        className="overflow-hidden rounded-lg border border-slate-200"
                                    >
                                        {/* Cabecera del módulo (clickable) */}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleModulo(grupo.modulo)
                                            }
                                            className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
                                        >
                                            <div className="flex items-center gap-2">
                                                {abierto ? (
                                                    <ChevronDown className="h-4 w-4 text-slate-500" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-slate-500" />
                                                )}
                                                <span className="text-sm font-medium capitalize text-slate-800">
                                                    {grupo.modulo}
                                                </span>
                                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                                                    {seleccionadosGrupo}/{totalGrupo}
                                                </span>
                                            </div>
                                            {/* Botón "marcar todos del módulo" */}
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) =>
                                                    toggleModuloCompleto(e, grupo)
                                                }
                                                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-emerald-600 hover:bg-emerald-50"
                                            >
                                                {todosGrupoMarcados
                                                    ? "Deseleccionar"
                                                    : "Seleccionar todos"}
                                            </span>
                                        </button>

                                        {/* Lista de permisos del módulo */}
                                        {abierto && (
                                            <ul className="divide-y divide-slate-100 border-t border-slate-100 bg-white">
                                                {grupo.permisos.map((p) => {
                                                    const checked = seleccionados.has(
                                                        p.clave,
                                                    );
                                                    return (
                                                        <li
                                                            key={p.id_permiso}
                                                            onClick={() =>
                                                                togglePermiso(p.clave)
                                                            }
                                                            className="flex cursor-pointer items-start gap-3 px-4 py-2.5 hover:bg-slate-50"
                                                        >
                                                            {checked ? (
                                                                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                                            ) : (
                                                                <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm text-slate-800">
                                                                    {p.nombre}
                                                                </p>
                                                                <p className="font-mono text-xs text-slate-400">
                                                                    {p.clave}
                                                                </p>
                                                                {p.descripcion && (
                                                                    <p className="mt-0.5 text-xs text-slate-500">
                                                                        {p.descripcion}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ═══════════ FOOTER ═══════════ */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                    {errorGuardar ? (
                        <p className="flex-1 text-xs text-red-600">
                            {errorGuardar}
                        </p>
                    ) : (
                        <p className="flex-1 text-xs text-slate-500">
                            {hayCambios
                                ? "Tienes cambios sin guardar"
                                : "Sin cambios"}
                        </p>
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCerrar}
                            disabled={guardarMutation.isPending}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-white disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => guardarMutation.mutate()}
                            disabled={
                                !hayCambios || guardarMutation.isPending || isLoading
                            }
                            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {guardarMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Guardar cambios
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};