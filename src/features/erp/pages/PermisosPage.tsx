// Módulo de gestión del catálogo de permisos del sistema ERP.
// Permite ver todos los permisos existentes y agregar nuevos.

import { useEffect, useState } from "react";
import { KeyRound, Plus, Search, ShieldCheck } from "lucide-react";
import { getPermisos, createPermiso } from "../services/erpService";
import type { PermisoSistema, PermisoFormData } from "../types/erp.types";

// ── Módulos disponibles para agrupar permisos visualmente
const MODULO_COLORS: Record<string, string> = {
    general: "bg-blue-50 text-blue-700",
    unidades: "bg-emerald-50 text-emerald-700",
    clientes: "bg-violet-50 text-violet-700",
    pois: "bg-amber-50 text-amber-700",
    reportes: "bg-rose-50 text-rose-700",
};

const moduloColor = (modulo: string) =>
    MODULO_COLORS[modulo] ?? "bg-slate-100 text-slate-600";

// ── Componente principal ──────────────────────────────────
export const PermisosPage = () => {
    const [permisos, setPermisos] = useState<PermisoSistema[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const cargarPermisos = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getPermisos();
            setPermisos(data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Error al cargar permisos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargarPermisos(); }, []);

    // Filtro local por clave, nombre o módulo
    const permisosFiltrados = permisos.filter((p) => {
        const q = search.toLowerCase();
        return (
            p.clave.toLowerCase().includes(q) ||
            p.nombre.toLowerCase().includes(q) ||
            p.modulo?.toLowerCase().includes(q)
        );
    });

    const handleSave = async (data: PermisoFormData) => {
        await createPermiso(data);
        setModalOpen(false);
        await cargarPermisos();
    };

    // ── Render ──
    return (
        <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
            <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">

                {/* Encabezado */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <KeyRound className="h-5 w-5 text-slate-500" />
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800">
                                Permisos del sistema
                            </h1>
                            <p className="text-xs text-slate-400">
                                {permisos.length} permiso{permisos.length !== 1 ? "s" : ""} registrados
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Buscador */}
                        <div className="flex items-center rounded-lg border border-slate-300 bg-white">
                            <div className="flex h-10 w-10 items-center justify-center border-r border-slate-300 text-emerald-500">
                                <Search className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="buscar clave, nombre, módulo..."
                                className="h-10 w-56 rounded-r-lg px-3 text-sm outline-none"
                            />
                        </div>

                        {/* Botón nuevo permiso */}
                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
                            className="flex h-10 w-12 items-center justify-center rounded-lg border border-emerald-400 bg-white text-emerald-500 hover:bg-emerald-50"
                            title="Agregar permiso"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Contenido */}
                <div className="p-6">

                    {loading && (
                        <div className="py-10 text-center text-slate-500">Cargando permisos...</div>
                    )}

                    {error && (
                        <div className="py-10 text-center text-red-500">{error}</div>
                    )}

                    {!loading && !error && permisosFiltrados.length === 0 && (
                        <div className="py-10 text-center text-slate-400">
                            {search ? "Sin resultados para tu búsqueda" : "No hay permisos registrados"}
                        </div>
                    )}

                    {!loading && !error && permisosFiltrados.length > 0 && (
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        {["Clave", "Nombre", "Módulo", "Usuarios", "Empresas", "Status"].map((h) => (
                                            <th key={h} className="border-b border-slate-200 px-4 py-3 text-left font-medium text-xs">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {permisosFiltrados.map((permiso) => (
                                        <tr key={permiso.id_permiso} className="hover:bg-slate-50">

                                            {/* Clave */}
                                            <td className="border-b border-slate-200 px-4 py-3">
                                                <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">
                                                    {permiso.clave}
                                                </code>
                                            </td>

                                            {/* Nombre + descripción */}
                                            <td className="border-b border-slate-200 px-4 py-3">
                                                <p className="font-medium text-slate-800">{permiso.nombre}</p>
                                                {permiso.descripcion && (
                                                    <p className="mt-0.5 text-xs text-slate-400">{permiso.descripcion}</p>
                                                )}
                                            </td>

                                            {/* Módulo con color */}
                                            <td className="border-b border-slate-200 px-4 py-3">
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${moduloColor(permiso.modulo)}`}>
                                                    {permiso.modulo || "—"}
                                                </span>
                                            </td>

                                            {/* Conteo de uso */}
                                            <td className="border-b border-slate-200 px-4 py-3 text-slate-500">
                                                <div className="flex items-center gap-1">
                                                    <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                                                    {permiso.usuarios_con_permiso}
                                                </div>
                                            </td>
                                            <td className="border-b border-slate-200 px-4 py-3 text-slate-500">
                                                {permiso.empresas_con_permiso}
                                            </td>

                                            {/* Status */}
                                            <td className="border-b border-slate-200 px-4 py-3">
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${permiso.status === 1
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-red-50 text-red-700"
                                                    }`}>
                                                    {permiso.status === 1 ? "Activo" : "Inactivo"}
                                                </span>
                                            </td>

                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            {/* Modal nuevo permiso */}
            {modalOpen && (
                <PermisoModal
                    onSave={handleSave}
                    onClose={() => setModalOpen(false)}
                />
            )}
        </main>
    );
};

// ── Modal de creación de permiso ──────────────────────────
interface PermisoModalProps {
    onSave: (data: PermisoFormData) => Promise<void>;
    onClose: () => void;
}

const MODULOS_DISPONIBLES = ["general", "unidades", "clientes", "pois", "reportes", "operacion"];

const PermisoModal = ({ onSave, onClose }: PermisoModalProps) => {
    const [form, setForm] = useState<PermisoFormData>({ clave: "", nombre: "", modulo: "", descripcion: "" });
    const [saving, setSaving] = useState(false);
    const [errMsg, setErrMsg] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!form.clave.trim() || !form.nombre.trim()) {
            setErrMsg("La clave y el nombre son obligatorios");
            return;
        }
        // La clave solo puede tener letras, números y guion bajo
        if (!/^[a-z0-9_]+$/.test(form.clave)) {
            setErrMsg("La clave solo puede contener letras minúsculas, números y guion bajo");
            return;
        }
        try {
            setSaving(true);
            setErrMsg(null);
            await onSave(form);
        } catch (e: unknown) {
            setErrMsg(e instanceof Error ? e.message : "Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-[420px] rounded-2xl bg-white p-7 shadow-2xl">
                <h2 className="mb-5 text-base font-semibold text-slate-800">Nuevo permiso</h2>

                {/* Clave */}
                <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                        Clave <span className="text-red-400">*</span>
                    </label>
                    <input
                        value={form.clave}
                        onChange={(e) => setForm((f) => ({ ...f, clave: e.target.value.toLowerCase() }))}
                        placeholder="ej: cund1, crep2..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-400"
                    />
                    <p className="mt-1 text-xs text-slate-400">Solo minúsculas, números y guion bajo</p>
                </div>

                {/* Nombre */}
                <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                        Nombre <span className="text-red-400">*</span>
                    </label>
                    <input
                        value={form.nombre}
                        onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                        placeholder="ej: Ver unidades"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                    />
                </div>

                {/* Módulo */}
                <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">Módulo</label>
                    <select
                        value={form.modulo}
                        onChange={(e) => setForm((f) => ({ ...f, modulo: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                    >
                        <option value="">Sin módulo</option>
                        {MODULOS_DISPONIBLES.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                {/* Descripción */}
                <div className="mb-5">
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">Descripción</label>
                    <textarea
                        value={form.descripcion}
                        onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                        placeholder="Descripción opcional del permiso..."
                        rows={2}
                        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                    />
                </div>

                {/* Error */}
                {errMsg && (
                    <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{errMsg}</p>
                )}

                {/* Acciones */}
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                    >
                        {saving ? "Guardando..." : "Guardar permiso"}
                    </button>
                </div>
            </div>
        </div>
    );
};