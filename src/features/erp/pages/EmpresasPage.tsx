// Módulo de gestión de empresas del panel ERP.
// Lista todas las empresas con sus métricas y permite crear, editar y suspender.
//
// Responsabilidad de este archivo: orquestar la página — carga de datos,
// filtrado, confirmaciones y coordinación con el modal.
// La UI del modal vive en ./components/EmpresaModal.tsx

import { useCallback, useEffect, useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Building2, Plus, Search } from "lucide-react";
import {
    getEmpresas,
    toggleEmpresaStatus,
    createEmpresa,
    updateEmpresa,
} from "../services/erpService";
import type { EmpresaResumen, EmpresaFormData } from "../types/erp.types";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmpresaModal } from "../components/EmpresaModal";

// ── Tipo para el estado del diálogo de confirmación ──────────────────────────
interface ConfirmState {
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    confirmButtonClassName: string;
    onConfirm: () => void;
}

// Estado cerrado reutilizable — evita repetir el objeto vacío en cada reset
const CONFIRM_CLOSED: ConfirmState = {
    open: false,
    title: "",
    description: "",
    confirmText: "",
    confirmButtonClassName: "",
    onConfirm: () => { },
};

// ── Componente principal ──────────────────────────────────────────────────────
export const EmpresasPage = () => {
    useDocumentTitle("Empresas");

    const [empresas, setEmpresas] = useState<EmpresaResumen[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estado del modal de creación/edición
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<EmpresaResumen | null>(null);

    // Estado del diálogo de confirmación — reemplaza confirm() y alert() nativos
    const [confirmState, setConfirmState] = useState<ConfirmState>(CONFIRM_CLOSED);

    // ── Carga de datos ────────────────────────────────────────────────────────
    // useCallback estabiliza la referencia de la función para que pueda usarse
    // de forma segura como dependencia en otros hooks sin recrearse en cada render.
    const cargarEmpresas = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getEmpresas();
            setEmpresas(data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Error al cargar empresas");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void cargarEmpresas();
    }, [cargarEmpresas]);

    // ── Filtrado local ────────────────────────────────────────────────────────
    const empresasFiltradas = empresas.filter((emp) => {
        const q = search.toLowerCase();
        return (
            emp.empresa.toLowerCase().includes(q) ||
            emp.email_principal?.toLowerCase().includes(q)
        );
    });

    // ── Helpers de UI ─────────────────────────────────────────────────────────

    // Muestra un diálogo de error accesible en lugar del alert() nativo
    const showError = useCallback((message: string) => {
        setConfirmState({
            open: true,
            title: "Ocurrió un error",
            description: message,
            confirmText: "Entendido",
            confirmButtonClassName: "bg-slate-800 text-white hover:bg-slate-700",
            onConfirm: () => setConfirmState(CONFIRM_CLOSED),
        });
    }, []);

    // ── Handlers de acciones ──────────────────────────────────────────────────

    const handleToggleStatus = useCallback((empresa: EmpresaResumen) => {
        const nuevoStatus = empresa.status === 1 ? 0 : 1;
        const accion = nuevoStatus === 0 ? "Suspender" : "Activar";
        const descripcion =
            nuevoStatus === 0
                ? `La empresa "${empresa.empresa}" quedará suspendida y sus usuarios no podrán acceder.`
                : `La empresa "${empresa.empresa}" volverá a estar activa.`;

        setConfirmState({
            open: true,
            title: `${accion} empresa`,
            description: descripcion,
            confirmText: accion,
            confirmButtonClassName:
                nuevoStatus === 0
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-700",
            onConfirm: async () => {
                setConfirmState(CONFIRM_CLOSED);
                try {
                    await toggleEmpresaStatus(empresa.id_empresa, nuevoStatus as 0 | 1);
                    await cargarEmpresas();
                } catch (e: unknown) {
                    showError(
                        e instanceof Error ? e.message : "Error al cambiar el status"
                    );
                }
            },
        });
    }, [cargarEmpresas, showError]);

    const handleOpenCreate = useCallback(() => {
        setEditTarget(null);
        setModalOpen(true);
    }, []);

    const handleOpenEdit = useCallback((emp: EmpresaResumen) => {
        setEditTarget(emp);
        setModalOpen(true);
    }, []);

    const handleModalSave = useCallback(async (data: EmpresaFormData) => {
        try {
            if (editTarget) {
                await updateEmpresa(editTarget.id_empresa, data);
            } else {
                await createEmpresa(data);
            }
            setModalOpen(false);
            await cargarEmpresas();
        } catch (e: unknown) {
            showError(
                e instanceof Error ? e.message : "Error al guardar la empresa"
            );
        }
    }, [editTarget, cargarEmpresas, showError]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
            <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">

                {/* ── Encabezado ── */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-slate-500" aria-hidden="true" />
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800">
                                Empresas
                            </h1>
                            <p className="text-xs text-slate-400">
                                {empresas.length} empresa{empresas.length !== 1 ? "s" : ""} registradas
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">

                        {/* Buscador */}
                        <div className="flex items-center rounded-lg border border-slate-300 bg-white">
                            <div
                                className="flex h-10 w-10 items-center justify-center border-r border-slate-300 text-blue-500"
                                aria-hidden="true"
                            >
                                <Search className="h-4 w-4" />
                            </div>
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar empresa o email..."
                                aria-label="Buscar empresa o email"
                                className="h-10 w-52 rounded-r-lg px-3 text-sm outline-none"
                            />
                        </div>

                        {/* Botón nueva empresa:
                            aria-label describe la acción para lectores de pantalla.
                            El ícono lleva aria-hidden para evitar que el lector
                            anuncie "Plus Nueva empresa" duplicando la información. */}
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            aria-label="Nueva empresa"
                            title="Nueva empresa"
                            className="flex h-10 w-12 items-center justify-center rounded-lg border border-blue-400 bg-white text-blue-500 hover:bg-blue-50"
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* ── Contenido ── */}
                <div className="p-6">

                    {loading && (
                        <div className="py-10 text-center text-slate-500">
                            Cargando empresas...
                        </div>
                    )}

                    {error && (
                        <div role="alert" className="py-10 text-center text-red-500">
                            {error}
                        </div>
                    )}

                    {!loading && !error && empresasFiltradas.length === 0 && (
                        <div className="py-10 text-center text-slate-400">
                            {search
                                ? "Sin resultados para tu búsqueda"
                                : "No hay empresas registradas"}
                        </div>
                    )}

                    {!loading && !error && empresasFiltradas.length > 0 && (
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        {["Empresa", "Unidades", "Usuarios", "Clientes", "Status", "Acciones"].map(
                                            (h) => (
                                                <th
                                                    key={h}
                                                    scope="col"
                                                    className="border-b border-slate-200 px-4 py-3 text-left text-xs font-medium"
                                                >
                                                    {h}
                                                </th>
                                            )
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {empresasFiltradas.map((emp) => (
                                        <tr key={emp.id_empresa} className="hover:bg-slate-50">

                                            {/* Nombre + email */}
                                            <td className="border-b border-slate-200 px-4 py-3">
                                                <p className="font-medium text-slate-800">{emp.empresa}</p>
                                                {emp.email_principal && (
                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                        {emp.email_principal}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Métricas */}
                                            <td className="border-b border-slate-200 px-4 py-3 text-slate-500">
                                                {emp.total_unidades}
                                            </td>
                                            <td className="border-b border-slate-200 px-4 py-3 text-slate-500">
                                                {emp.total_usuarios}
                                            </td>
                                            <td className="border-b border-slate-200 px-4 py-3 text-slate-500">
                                                {emp.total_clientes}
                                            </td>

                                            {/* Status con badge de color */}
                                            <td className="border-b border-slate-200 px-4 py-3">
                                                <span
                                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${emp.status === 1
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-red-50 text-red-700"
                                                        }`}
                                                >
                                                    {emp.status === 1 ? "Activa" : "Suspendida"}
                                                </span>
                                            </td>

                                            {/* Acciones */}
                                            <td className="border-b border-slate-200 px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(emp)}
                                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(emp)}
                                                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${emp.status === 1
                                                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                                            }`}
                                                    >
                                                        {emp.status === 1 ? "Suspender" : "Activar"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            {/* Modal crear / editar — montado condicionalmente para que
                el useEffect de autoenfoque se dispare en cada apertura */}
            {modalOpen && (
                <EmpresaModal
                    empresa={editTarget}
                    onSave={handleModalSave}
                    onClose={() => setModalOpen(false)}
                />
            )}

            {/* Diálogo de confirmación — reemplaza confirm() y alert() nativos */}
            <ConfirmDialog
                open={confirmState.open}
                onOpenChange={(open) => !open && setConfirmState(CONFIRM_CLOSED)}
                title={confirmState.title}
                description={confirmState.description}
                confirmText={confirmState.confirmText}
                confirmButtonClassName={confirmState.confirmButtonClassName}
                onConfirm={confirmState.onConfirm}
            />
        </main>
    );
};