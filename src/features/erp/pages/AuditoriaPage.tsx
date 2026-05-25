import { Fragment, useMemo, useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { TableSkeleton } from "@/components/shared/SkeletonCard";
import {
    ClipboardList, Filter, RefreshCw, Search, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAuditoria, getAuditUsers } from "../services/erpService";
import {
    ACCIONES_AUDITORIA, ENTIDADES_AUDITORIA,
    type RegistroAuditoria, type FiltrosAuditoria,
} from "../types/erp.types";
import { queryKeys } from "@/lib/query-keys";
import { formatAppDateTimeShort } from "@/lib/date-time";
import { CatalogLayout, CatalogHeader } from "@/components/shared";

// Chips de color por tipo de acción — reconocimiento visual sin leer el texto
const ACCION_STYLES: Record<string, string> = {
    CREATE:         "bg-emerald-50 text-emerald-700",
    UPDATE:         "bg-blue-50 text-blue-700",
    DELETE:         "bg-red-50 text-red-700",
    SUSPEND:        "bg-amber-50 text-amber-700",
    ACTIVATE:       "bg-emerald-50 text-emerald-700",
    PROMOTE_ADMIN:  "bg-violet-50 text-violet-700",
    REVOKE_ADMIN:   "bg-slate-100 text-slate-600",
    LOGIN:          "bg-sky-50 text-sky-700",
    CREATE_USUARIO: "bg-emerald-50 text-emerald-700",
    UPDATE_USUARIO: "bg-blue-50 text-blue-700",
    INHABILITAR:    "bg-amber-50 text-amber-700",
    REACTIVAR:      "bg-emerald-50 text-emerald-700",
    DELETE_PERM:    "bg-red-50 text-red-700",
    RESET_CLAVE:    "bg-orange-50 text-orange-700",
};
const accionStyle = (a: string) =>
    ACCION_STYLES[a] ?? "bg-slate-100 text-slate-600";

const formatFechaCorta = (iso: string) => formatAppDateTimeShort(iso);

export const AuditoriaPage = () => {
    useDocumentTitle("Auditoría");

    const [filtros, setFiltros]             = useState<FiltrosAuditoria>({ limit: 50 });
    const [expandedId, setExpandedId]       = useState<number | null>(null);
    const [showUsuarioDropdown, setShowUsuarioDropdown] = useState(false);
    const [usuarioBusqueda, setUsuarioBusqueda] = useState("");

    const { data: registros = [], isLoading, error, refetch } = useQuery<RegistroAuditoria[]>({
        queryKey: queryKeys.erp.auditoria(filtros.entidad ?? "", filtros.limit ?? 50),
        queryFn: () => getAuditoria(filtros),
    });

    const { data: usuarios = [] } = useQuery({
        queryKey: queryKeys.erp.auditUsers(),
        queryFn: getAuditUsers,
        staleTime: 5 * 60 * 1000,
    });

    const usuariosFiltrados = useMemo(() => {
        if (!usuarioBusqueda.trim()) return usuarios;
        const q = usuarioBusqueda.trim().toLowerCase();
        return usuarios.filter(
            (u) =>
                u.usuario.toLowerCase().includes(q) ||
                u.nombre.toLowerCase().includes(q),
        );
    }, [usuarios, usuarioBusqueda]);

    const setFiltro = <K extends keyof FiltrosAuditoria>(
        key: K,
        value: FiltrosAuditoria[K],
    ) => setFiltros((prev) => ({ ...prev, [key]: value }));

    const limpiarFiltros = () => {
        setFiltros({ limit: 50 });
        setUsuarioBusqueda("");
        setShowUsuarioDropdown(false);
    };

    const filtrosActivos = useMemo(() => {
        let count = 0;
        if (filtros.entidad)              count++;
        if (filtros.id_usuario !== undefined) count++;
        if (filtros.accion)               count++;
        if (filtros.fecha_desde)          count++;
        if (filtros.fecha_hasta)          count++;
        return count;
    }, [filtros]);

    const errorRangoFechas = useMemo(() => {
        if (!filtros.fecha_desde || !filtros.fecha_hasta) return null;
        if (filtros.fecha_desde > filtros.fecha_hasta) {
            return "La fecha 'Desde' debe ser menor o igual a 'Hasta'";
        }
        return null;
    }, [filtros.fecha_desde, filtros.fecha_hasta]);

    const usuarioSeleccionado = useMemo(
        () => usuarios.find((u) => u.id === filtros.id_usuario),
        [usuarios, filtros.id_usuario],
    );

    const errorMessage = error instanceof Error ? error.message : null;
    const toggleExpand = (id: number) =>
        setExpandedId((prev) => (prev === id ? null : id));

    // Acciones del toolbar: limpiar filtros + recargar
    const toolbarExtra = (
        <div className="flex items-center gap-2">
            {filtrosActivos > 0 && (
                <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                    title="Quitar todos los filtros"
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
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
        </div>
    );

    return (
        <CatalogLayout>
            <CatalogHeader
                icon={ClipboardList}
                title="Auditoría"
                subtitle={
                    filtrosActivos > 0
                        ? `${registros.length} registro${registros.length !== 1 ? "s" : ""} · ${filtrosActivos} filtro${filtrosActivos !== 1 ? "s" : ""} activo${filtrosActivos !== 1 ? "s" : ""}`
                        : `${registros.length} registro${registros.length !== 1 ? "s" : ""}`
                }
                search=""
                onSearchChange={() => {}}
                toolbarExtra={toolbarExtra}
            />

            {/* Filtros — específicos de auditoría, no se generalizan */}
            <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                    <Filter className="h-3.5 w-3.5" />
                    Filtros
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">

                    {/* Usuario — dropdown filtrable */}
                    <div className="relative">
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                            Usuario
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowUsuarioDropdown((v) => !v)}
                            className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                            <span className="truncate">
                                {usuarioSeleccionado
                                    ? `${usuarioSeleccionado.nombre} (${usuarioSeleccionado.usuario})`
                                    : "Todos los usuarios"}
                            </span>
                            {showUsuarioDropdown
                                ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                                : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
                        </button>

                        {showUsuarioDropdown && (
                            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg">
                                <div className="border-b border-slate-100 p-2">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={usuarioBusqueda}
                                            onChange={(e) => setUsuarioBusqueda(e.target.value)}
                                            placeholder="Buscar usuario…"
                                            autoFocus
                                            className="w-full rounded-md border border-slate-200 py-1.5 pl-8 pr-2 text-xs outline-none focus:border-emerald-400"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    <button
                                        type="button"
                                        onClick={() => { setFiltro("id_usuario", undefined); setShowUsuarioDropdown(false); setUsuarioBusqueda(""); }}
                                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50 ${filtros.id_usuario === undefined ? "bg-emerald-50 text-emerald-700" : "text-slate-700"}`}
                                    >
                                        <span>Todos los usuarios</span>
                                    </button>
                                    {usuariosFiltrados.length === 0 && (
                                        <p className="px-3 py-4 text-center text-xs text-slate-400">Sin resultados</p>
                                    )}
                                    {usuariosFiltrados.map((u) => (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => { setFiltro("id_usuario", u.id); setShowUsuarioDropdown(false); setUsuarioBusqueda(""); }}
                                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50 ${filtros.id_usuario === u.id ? "bg-emerald-50 text-emerald-700" : "text-slate-700"}`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium">{u.nombre}</p>
                                                <p className="truncate text-slate-400">{u.usuario}</p>
                                            </div>
                                            <span className="ml-2 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                                {u.total_eventos}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Acción */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Acción</label>
                        <select value={filtros.accion ?? ""} onChange={(e) => setFiltro("accion", e.target.value || undefined)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400">
                            <option value="">Todas las acciones</option>
                            {ACCIONES_AUDITORIA.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>

                    {/* Entidad */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Entidad</label>
                        <select value={filtros.entidad ?? ""} onChange={(e) => setFiltro("entidad", e.target.value || undefined)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400">
                            <option value="">Todas las entidades</option>
                            {ENTIDADES_AUDITORIA.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>

                    {/* Fecha desde */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Desde</label>
                        <input type="date" value={filtros.fecha_desde ?? ""} onChange={(e) => setFiltro("fecha_desde", e.target.value || undefined)} max={filtros.fecha_hasta} className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 ${errorRangoFechas ? "border-red-300" : "border-slate-300"}`} />
                    </div>

                    {/* Fecha hasta */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Hasta</label>
                        <input type="date" value={filtros.fecha_hasta ?? ""} onChange={(e) => setFiltro("fecha_hasta", e.target.value || undefined)} min={filtros.fecha_desde} className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 ${errorRangoFechas ? "border-red-300" : "border-slate-300"}`} />
                    </div>

                    {/* Límite de registros */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Mostrar</label>
                        <select value={filtros.limit ?? 50} onChange={(e) => setFiltro("limit", Number(e.target.value))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400">
                            {[25, 50, 100, 200, 500].map((n) => <option key={n} value={n}>Últimos {n}</option>)}
                        </select>
                    </div>
                </div>

                {errorRangoFechas && (
                    <p className="mt-2 text-xs text-red-600">{errorRangoFechas}</p>
                )}
            </div>

            <div className="p-6">
                {isLoading && (
                    <TableSkeleton headers={["Fecha", "Usuario", "Entidad", "Acción", "IP", "Detalle"]} cols={6} rows={8} />
                )}
                {errorMessage && (
                    <div className="py-10 text-center text-red-500">{errorMessage}</div>
                )}
                {!isLoading && !errorMessage && registros.length === 0 && (
                    <div className="py-10 text-center">
                        <p className="text-slate-400">No hay registros de auditoría</p>
                        {filtrosActivos > 0 && (
                            <button type="button" onClick={limpiarFiltros} className="mt-3 text-sm text-emerald-600 hover:underline">
                                Quitar filtros
                            </button>
                        )}
                    </div>
                )}
                {!isLoading && !errorMessage && registros.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    {["Fecha", "Usuario", "Entidad", "Acción", "IP", "Detalle"].map((h) => (
                                        <th key={h} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-medium">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {registros.map((reg) => (
                                    <Fragment key={reg.id_auditoria}>
                                        <tr className="cursor-pointer hover:bg-slate-50" onClick={() => toggleExpand(reg.id_auditoria)}>
                                            <td className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs text-slate-500">
                                                {formatFechaCorta(reg.fecha_registro)}
                                            </td>
                                            <td className="border-b border-slate-200 px-4 py-3">
                                                <p className="text-xs font-medium text-slate-800">{reg.nombre_usuario}</p>
                                                <p className="text-xs text-slate-400">{reg.email_usuario}</p>
                                            </td>
                                            <td className="border-b border-slate-200 px-4 py-3">
                                                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">{reg.entidad}</span>
                                                {reg.id_entidad && <span className="ml-1.5 text-xs text-slate-400">#{reg.id_entidad}</span>}
                                            </td>
                                            <td className="border-b border-slate-200 px-4 py-3">
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${accionStyle(reg.accion)}`}>
                                                    {reg.accion}
                                                </span>
                                            </td>
                                            <td className="border-b border-slate-200 px-4 py-3 text-xs text-slate-400">{reg.ip_origen ?? "—"}</td>
                                            <td className="border-b border-slate-200 px-4 py-3 text-xs text-emerald-500">
                                                {reg.datos_nuevos || reg.datos_anteriores
                                                    ? expandedId === reg.id_auditoria ? "Ocultar ▲" : "Ver ▼"
                                                    : "—"}
                                            </td>
                                        </tr>
                                        {expandedId === reg.id_auditoria && (
                                            <tr>
                                                <td colSpan={6} className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                                                    <div className="flex gap-6">
                                                        {reg.datos_anteriores && (
                                                            <div className="flex-1">
                                                                <p className="mb-1.5 text-xs font-medium text-slate-500">Antes</p>
                                                                <pre className="max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
                                                                    {JSON.stringify(reg.datos_anteriores, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {reg.datos_nuevos && (
                                                            <div className="flex-1">
                                                                <p className="mb-1.5 text-xs font-medium text-slate-500">Después</p>
                                                                <pre className="max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
                                                                    {JSON.stringify(reg.datos_nuevos, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </CatalogLayout>
    );
};