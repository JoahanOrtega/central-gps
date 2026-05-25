import { useCallback, useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Building2, Plus, UserPlus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getEmpresas,
    toggleEmpresaStatus,
    createEmpresa,
    updateEmpresa,
    createAdminEmpresa,
} from "../services/erpService";
import type {
    EmpresaResumen,
    EmpresaFormData,
    AdminEmpresaFormData,
} from "../types/erp.types";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmpresaModal } from "../components/EmpresaModal";
import { AdminEmpresaModal } from "../components/AdminEmpresaModal";
import { queryKeys } from "@/lib/query-keys";
import { CatalogLayout, CatalogHeader } from "@/components/shared";

// Estado del ConfirmDialog 
interface ConfirmState {
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    confirmButtonClassName: string;
    onConfirm: () => void;
}

const CONFIRM_CLOSED: ConfirmState = {
    open: false, title: "", description: "",
    confirmText: "", confirmButtonClassName: "", onConfirm: () => {},
};

export const EmpresasPage = () => {
    useDocumentTitle("Empresas");
    const queryClient = useQueryClient();

    const [search, setSearch]               = useState("");
    const [modalOpen, setModalOpen]         = useState(false);
    const [editTarget, setEditTarget]       = useState<EmpresaResumen | null>(null);
    const [adminModalTarget, setAdminModalTarget] = useState<EmpresaResumen | null>(null);
    const [confirmState, setConfirmState]   = useState<ConfirmState>(CONFIRM_CLOSED);

    const { data: empresas = [], isLoading, error } = useQuery<EmpresaResumen[]>({
        queryKey: queryKeys.erp.empresas(),
        queryFn: getEmpresas,
    });

    const invalidar = () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.erp.empresas() });

    // Filtrado local
    const empresasFiltradas = empresas.filter((emp) => {
        const q = search.toLowerCase();
        return (
            emp.empresa.toLowerCase().includes(q) ||
            emp.email_principal?.toLowerCase().includes(q)
        );
    });

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

    const handleToggleStatus = useCallback((empresa: EmpresaResumen) => {
        const nuevoStatus  = empresa.status === 1 ? 0 : 1;
        const accion       = nuevoStatus === 0 ? "Suspender" : "Activar";
        setConfirmState({
            open: true,
            title: `${accion} empresa`,
            description: `¿Deseas ${accion.toLowerCase()} "${empresa.empresa}"?`,
            confirmText: accion.toUpperCase(),
            confirmButtonClassName:
                nuevoStatus === 0
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-700",
            onConfirm: async () => {
                setConfirmState(CONFIRM_CLOSED);
                try {
                    await toggleEmpresaStatus(empresa.id_empresa, nuevoStatus as 0 | 1);
                    await invalidar();
                } catch (e) {
                    showError(e instanceof Error ? e.message : "Error al cambiar el status");
                }
            },
        });
    }, [showError]);

    const handleModalSave = useCallback(async (data: EmpresaFormData) => {
        try {
            if (editTarget) { await updateEmpresa(editTarget.id_empresa, data); }
            else            { await createEmpresa(data); }
            setModalOpen(false);
            await invalidar();
        } catch (e) {
            showError(e instanceof Error ? e.message : "Error al guardar la empresa");
        }
    }, [editTarget, showError]);

    const handleAdminModalSave = useCallback(async (data: AdminEmpresaFormData) => {
        if (!adminModalTarget) return;
        try {
            await createAdminEmpresa(adminModalTarget.id_empresa, data);
            setAdminModalTarget(null);
            await invalidar();
            setConfirmState({
                open: true,
                title: "Administrador creado",
                description: `El usuario "${data.usuario}" fue creado como administrador de "${adminModalTarget.empresa}".`,
                confirmText: "Entendido",
                confirmButtonClassName: "bg-emerald-600 text-white hover:bg-emerald-700",
                onConfirm: () => setConfirmState(CONFIRM_CLOSED),
            });
        } catch (e) {
            showError(e instanceof Error ? e.message : "Error al crear el administrador");
        }
    }, [adminModalTarget, showError]);

    const errorMessage = error instanceof Error ? error.message : null;

    // Botón agregar empresa
    const toolbarExtra = (
        <button
            type="button"
            onClick={() => { setEditTarget(null); setModalOpen(true); }}
            aria-label="Nueva empresa"
            title="Nueva empresa"
            className="flex h-10 w-12 items-center justify-center rounded-lg border border-blue-400 bg-white text-blue-500 hover:bg-blue-50"
        >
            <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
    );

    return (
        <CatalogLayout>
            <CatalogHeader
                icon={Building2}
                title="Empresas"
                subtitle={`${empresas.length} empresa${empresas.length !== 1 ? "s" : ""} registradas`}
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar empresa o email..."
                toolbarExtra={toolbarExtra}
            />

            <div className="p-6">
                {isLoading && (
                    <div className="py-10 text-center text-slate-500">
                        Cargando empresas...
                    </div>
                )}
                {errorMessage && (
                    <div role="alert" className="py-10 text-center text-red-500">
                        {errorMessage}
                    </div>
                )}
                {!isLoading && !errorMessage && empresasFiltradas.length === 0 && (
                    <div className="py-10 text-center text-slate-400">
                        {search ? "Sin resultados para tu búsqueda" : "No hay empresas registradas"}
                    </div>
                )}
                {!isLoading && !errorMessage && empresasFiltradas.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    {["Empresa", "Unidades", "Usuarios", "Clientes", "Status", "Acciones"].map((h) => (
                                        <th key={h} scope="col" className="border-b border-slate-200 px-4 py-3 text-left text-xs font-medium">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {empresasFiltradas.map((emp) => (
                                    <tr key={emp.id_empresa} className="hover:bg-slate-50">
                                        <td className="border-b border-slate-200 px-4 py-3">
                                            <p className="font-medium text-slate-800">{emp.empresa}</p>
                                            {emp.email_principal && (
                                                <p className="mt-0.5 text-xs text-slate-400">{emp.email_principal}</p>
                                            )}
                                        </td>
                                        <td className="border-b border-slate-200 px-4 py-3 text-slate-500">{emp.total_unidades}</td>
                                        <td className="border-b border-slate-200 px-4 py-3 text-slate-500">{emp.total_usuarios}</td>
                                        <td className="border-b border-slate-200 px-4 py-3 text-slate-500">{emp.total_clientes}</td>
                                        <td className="border-b border-slate-200 px-4 py-3">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${emp.status === 1 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                                                {emp.status === 1 ? "Activa" : "Suspendida"}
                                            </span>
                                        </td>
                                        <td className="border-b border-slate-200 px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { setEditTarget(emp); setModalOpen(true); }}
                                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAdminModalTarget(emp)}
                                                    disabled={emp.status !== 1}
                                                    title={emp.status === 1 ? "Crear usuario administrador" : "Activa la empresa para crear admins"}
                                                    className="flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                                                    Admin
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(emp)}
                                                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${emp.status === 1 ? "border-red-200 text-red-600 hover:bg-red-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}
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

            {modalOpen && (
                <EmpresaModal
                    empresa={editTarget}
                    onSave={handleModalSave}
                    onClose={() => setModalOpen(false)}
                />
            )}

            {adminModalTarget && (
                <AdminEmpresaModal
                    empresaNombre={adminModalTarget.empresa}
                    onSave={handleAdminModalSave}
                    onClose={() => setAdminModalTarget(null)}
                />
            )}

            <ConfirmDialog
                open={confirmState.open}
                onOpenChange={(open) => !open && setConfirmState(CONFIRM_CLOSED)}
                title={confirmState.title}
                description={confirmState.description}
                confirmText={confirmState.confirmText}
                confirmButtonClassName={confirmState.confirmButtonClassName}
                onConfirm={confirmState.onConfirm}
            />
        </CatalogLayout>
    );
};