import { useMemo, useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ShieldCheck, RefreshCw, Search, Pencil, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUsersPermissions } from "../services/erpService";
import type { UsuarioConPermisos } from "../types/erp.types";
import { queryKeys } from "@/lib/query-keys";
import { PermissionsEditModal } from "../components/PermissionsEditModal";

// ═════════════════════════════════════════════════════════════════════════════
// Estilos por rol — chips de color para reconocimiento rápido
// ═════════════════════════════════════════════════════════════════════════════
// Heurística #6 (Reconocer en lugar de recordar): el color comunica el tipo
// de rol sin que el usuario tenga que leer el texto completo cada vez.
const ROL_STYLES: Record<string, string> = {
    admin_empresa: "bg-violet-50 text-violet-700",
    usuario: "bg-slate-100 text-slate-600",
};
const rolStyle = (clave: string) =>
    ROL_STYLES[clave] ?? "bg-slate-100 text-slate-600";

// ═════════════════════════════════════════════════════════════════════════════
// Componente principal
// ═════════════════════════════════════════════════════════════════════════════
export const PermisosPage = () => {
    useDocumentTitle("Permisos");

    // ── Estado local ──────────────────────────────────────────────────────
    const [search, setSearch] = useState("");
    const [filtroRol, setFiltroRol] = useState<string>("");

    // Estado del modal: cuando hay valor, está abierto
    const [usuarioEditando, setUsuarioEditando] =
        useState<UsuarioConPermisos | null>(null);

    // ── Carga de datos ────────────────────────────────────────────────────
    const {
        data: usuarios = [],
        isLoading,
        error,
        refetch,
    } = useQuery<UsuarioConPermisos[]>({
        queryKey: queryKeys.erp.usersPermissions(),
        queryFn: getUsersPermissions,
    });

    // ── Filtrado client-side ──────────────────────────────────────────────
    // Filtra por nombre/email/empresa + por rol seleccionado.
    // Heurística #7 (Flexibilidad): combinables sin restricción.
    const usuariosFiltrados = useMemo(() => {
        const q = search.trim().toLowerCase();

        return usuarios.filter((u) => {
            const matchSearch =
                !q ||
                u.nombre.toLowerCase().includes(q) ||
                u.usuario.toLowerCase().includes(q) ||
                u.empresa.toLowerCase().includes(q);

            const matchRol = !filtroRol || u.rol_clave === filtroRol;

            return matchSearch && matchRol;
        });
    }, [usuarios, search, filtroRol]);

    // ── Conteo de filtros activos (para el badge de "Limpiar") ────────────
    const filtrosActivos = (search ? 1 : 0) + (filtroRol ? 1 : 0);

    const limpiarFiltros = () => {
        setSearch("");
        setFiltroRol("");
    };

    const errorMessage = error instanceof Error ? error.message : null;

    return (
        <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
            <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {/* ═══════════ HEADER ═══════════ */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-slate-500" />
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800">
                                Gestión de Permisos
                            </h1>
                            <p className="text-xs text-slate-400">
                                {usuariosFiltrados.length} de {usuarios.length} usuario
                                {usuarios.length !== 1 ? "s" : ""}
                                {filtrosActivos > 0 && (
                                    <span className="ml-2 text-emerald-600">
                                        · {filtrosActivos} filtro
                                        {filtrosActivos !== 1 ? "s" : ""} activo
                                        {filtrosActivos !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {filtrosActivos > 0 && (
                            <button
                                type="button"
                                onClick={limpiarFiltros}
                                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                            >
                                <X className="h-3.5 w-3.5" />
                                Limpiar filtros
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => refetch()}
                            disabled={isLoading}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                            title="Recargar"
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                            />
                        </button>
                    </div>
                </div>

                {/* ═══════════ FILTROS ═══════════ */}
                <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        {/* Buscar por nombre/email/empresa */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                                Buscar
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Nombre, email o empresa..."
                                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-emerald-400"
                                />
                            </div>
                        </div>

                        {/* Filtro por rol */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                                Rol
                            </label>
                            <select
                                value={filtroRol}
                                onChange={(e) => setFiltroRol(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400"
                            >
                                <option value="">Todos los roles</option>
                                <option value="admin_empresa">Administrador Empresa</option>
                                <option value="usuario">Usuario</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ═══════════ TABLA ═══════════ */}
                <div className="p-6">
                    {isLoading && (
                        <div className="py-10 text-center text-slate-500">
                            Cargando usuarios...
                        </div>
                    )}
                    {errorMessage && (
                        <div className="py-10 text-center text-red-500">
                            {errorMessage}
                        </div>
                    )}
                    {!isLoading && !errorMessage && usuariosFiltrados.length === 0 && (
                        <div className="py-10 text-center">
                            <p className="text-slate-400">
                                {usuarios.length === 0
                                    ? "No hay usuarios registrados"
                                    : "No hay usuarios que coincidan con los filtros"}
                            </p>
                            {filtrosActivos > 0 && (
                                <button
                                    type="button"
                                    onClick={limpiarFiltros}
                                    className="mt-3 text-sm text-emerald-600 hover:underline"
                                >
                                    Quitar filtros
                                </button>
                            )}
                        </div>
                    )}
                    {!isLoading && !errorMessage && usuariosFiltrados.length > 0 && (
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        {["Usuario", "Empresa", "Rol", "Permisos", "Acciones"].map(
                                            (h) => (
                                                <th
                                                    key={h}
                                                    className="border-b border-slate-200 px-4 py-3 text-left text-xs font-medium"
                                                >
                                                    {h}
                                                </th>
                                            ),
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuariosFiltrados.map((u) => (
                                        <tr
                                            key={`${u.id_usuario}-${u.id_empresa}`}
                                            className="hover:bg-slate-50"
                                        >
                                            <td className="border-b border-slate-200 px-4 py-3">
                                                <p className="text-sm font-medium text-slate-800">
                                                    {u.nombre}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {u.usuario}
                                                </p>
                                            </td>
                                            <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                                                {u.empresa}
                                            </td>
                                            <td className="border-b border-slate-200 px-4 py-3">
                                                <span
                                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${rolStyle(u.rol_clave)}`}
                                                >
                                                    {u.rol_nombre}
                                                </span>
                                            </td>
                                            <td className="border-b border-slate-200 px-4 py-3">
                                                {/* Mostrar el conteo con énfasis visual.
                                                    Cuando es 0, lo coloreamos en ámbar para
                                                    llamar la atención (Heurística #1: visibilidad
                                                    del estado). */}
                                                <span
                                                    className={`text-sm font-mono ${u.total_permisos === 0
                                                            ? "text-amber-600"
                                                            : "text-slate-700"
                                                        }`}
                                                >
                                                    {u.total_permisos}
                                                </span>
                                                <span className="ml-1 text-xs text-slate-400">
                                                    asignado{u.total_permisos !== 1 ? "s" : ""}
                                                </span>
                                            </td>
                                            <td className="border-b border-slate-200 px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setUsuarioEditando(u)}
                                                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                    Editar permisos
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            {/* ═══════════ MODAL DE EDICIÓN ═══════════ */}
            {/* Renderiza solo cuando hay usuario seleccionado.
                onClose recibe true si se guardaron cambios — útil para
                mostrar un toast si quisiéramos en el futuro. */}
            {usuarioEditando && (
                <PermissionsEditModal
                    usuario={usuarioEditando}
                    onClose={() => setUsuarioEditando(null)}
                />
            )}
        </main>
    );
};
