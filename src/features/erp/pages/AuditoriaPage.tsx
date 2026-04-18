import { useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ClipboardList, Filter, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAuditoria } from "../services/erpService";
import type { RegistroAuditoria } from "../types/erp.types";
import { queryKeys } from "@/lib/query-keys";

const ACCION_STYLES: Record<string, string> = {
    CREATE: "bg-emerald-50 text-emerald-700", UPDATE: "bg-blue-50 text-blue-700",
    DELETE: "bg-red-50 text-red-700", SUSPEND: "bg-amber-50 text-amber-700",
    ACTIVATE: "bg-emerald-50 text-emerald-700", PROMOTE_ADMIN: "bg-violet-50 text-violet-700",
    REVOKE_ADMIN: "bg-slate-100 text-slate-600", LOGIN: "bg-sky-50 text-sky-700",
};
const accionStyle = (a: string) => ACCION_STYLES[a] ?? "bg-slate-100 text-slate-600";
const ENTIDADES = ["", "empresa", "usuario", "usuario_empresa", "permiso"];
const formatFecha = (iso: string) => new Date(iso).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});

export const AuditoriaPage = () => {
    useDocumentTitle("Auditoría");
    const [entidad, setEntidad] = useState("");
    const [limit, setLimit] = useState(50);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // TanStack Query — los filtros (entidad, limit) son parte de la queryKey.
    // Al cambiar cualquier filtro, se hace una nueva petición automáticamente.
    // refetch() cubre el botón manual de recargar.
    const { data: registros = [], isLoading, error, refetch } = useQuery<RegistroAuditoria[]>({
        queryKey: queryKeys.erp.auditoria(entidad, limit),
        queryFn: () => getAuditoria({ limit, entidad: entidad || undefined }),
    });

    const errorMessage = error instanceof Error ? error.message : null;
    const toggleExpand = (id: number) => setExpandedId((prev) => prev === id ? null : id);

    return (
        <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
            <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <ClipboardList className="h-5 w-5 text-slate-500" />
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800">Auditoría</h1>
                            <p className="text-xs text-slate-400">{registros.length} registro{registros.length !== 1 ? "s" : ""}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5">
                            <Filter className="h-3.5 w-3.5 text-slate-400" />
                            <select value={entidad} onChange={(e) => setEntidad(e.target.value)} className="text-sm text-slate-600 outline-none bg-transparent">
                                <option value="">Todas las entidades</option>
                                {ENTIDADES.filter(Boolean).map((e) => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 outline-none">
                            {[25, 50, 100, 200].map((n) => <option key={n} value={n}>Últimos {n}</option>)}
                        </select>
                        <button type="button" onClick={() => refetch()} disabled={isLoading} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-50" title="Recargar">
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {isLoading && <div className="py-10 text-center text-slate-500">Cargando registros...</div>}
                    {errorMessage && <div className="py-10 text-center text-red-500">{errorMessage}</div>}
                    {!isLoading && !errorMessage && registros.length === 0 && (
                        <div className="py-10 text-center text-slate-400">No hay registros de auditoría</div>
                    )}
                    {!isLoading && !errorMessage && registros.length > 0 && (
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>{["Fecha", "Usuario", "Entidad", "Acción", "IP", "Detalle"].map((h) => (
                                        <th key={h} className="border-b border-slate-200 px-4 py-3 text-left text-xs font-medium">{h}</th>
                                    ))}</tr>
                                </thead>
                                <tbody>
                                    {registros.map((reg) => (
                                        <>
                                            <tr key={reg.id_auditoria} className="cursor-pointer hover:bg-slate-50" onClick={() => toggleExpand(reg.id_auditoria)}>
                                                <td className="border-b border-slate-200 px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatFecha(reg.fecha_registro)}</td>
                                                <td className="border-b border-slate-200 px-4 py-3">
                                                    <p className="font-medium text-slate-800 text-xs">{reg.nombre_usuario}</p>
                                                    <p className="text-xs text-slate-400">{reg.email_usuario}</p>
                                                </td>
                                                <td className="border-b border-slate-200 px-4 py-3">
                                                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">{reg.entidad}</span>
                                                    {reg.id_entidad && <span className="ml-1.5 text-xs text-slate-400">#{reg.id_entidad}</span>}
                                                </td>
                                                <td className="border-b border-slate-200 px-4 py-3">
                                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${accionStyle(reg.accion)}`}>{reg.accion}</span>
                                                </td>
                                                <td className="border-b border-slate-200 px-4 py-3 text-xs text-slate-400">{reg.ip_origen ?? "—"}</td>
                                                <td className="border-b border-slate-200 px-4 py-3 text-xs text-emerald-500">
                                                    {(reg.datos_nuevos || reg.datos_anteriores) ? expandedId === reg.id_auditoria ? "Ocultar ▲" : "Ver ▼" : "—"}
                                                </td>
                                            </tr>
                                            {expandedId === reg.id_auditoria && (
                                                <tr key={`${reg.id_auditoria}-detail`}>
                                                    <td colSpan={6} className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                                                        <div className="flex gap-6">
                                                            {reg.datos_anteriores && (
                                                                <div className="flex-1">
                                                                    <p className="mb-1.5 text-xs font-medium text-slate-500">Antes</p>
                                                                    <pre className="overflow-auto rounded-lg bg-white border border-slate-200 p-3 text-xs text-slate-700 max-h-40">{JSON.stringify(reg.datos_anteriores, null, 2)}</pre>
                                                                </div>
                                                            )}
                                                            {reg.datos_nuevos && (
                                                                <div className="flex-1">
                                                                    <p className="mb-1.5 text-xs font-medium text-slate-500">Después</p>
                                                                    <pre className="overflow-auto rounded-lg bg-white border border-slate-200 p-3 text-xs text-slate-700 max-h-40">{JSON.stringify(reg.datos_nuevos, null, 2)}</pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
};