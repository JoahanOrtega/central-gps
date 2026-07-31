import { useMemo, useState } from "react";
import { MessageSquare, Users, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { destinoService } from "../services/destinoService";
import { getEmpresas } from "../services/erpService";
import type { EmpresaResumen } from "../types/erp.types";
import type { Destino } from "../types/destino.types";
import { DestinoModal } from "../components/DestinoModal";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { CatalogLayout, CatalogHeader } from "@/components/shared";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { queryKeys } from "@/lib/query-keys";

const QK_DESTINOS = ["whatsapp-destinos"] as const;

interface ConfirmState { open: boolean; destino: Destino | null; }
const CONFIRM_CLOSED: ConfirmState = { open: false, destino: null };

export function DestinosWhatsappPage() {
    useDocumentTitle("Destinos WhatsApp");

    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editTarget, setEditTarget] = useState<Destino | null>(null);
    const [confirm, setConfirm] = useState<ConfirmState>(CONFIRM_CLOSED);

    const { data: destinos = [], isLoading, isError } = useQuery<Destino[]>({
        queryKey: QK_DESTINOS,
        queryFn: () => destinoService.listar(),
    });

    // Nombres de empresas — misma queryKey que EmpresasPage: caché compartido,
    // cero peticiones extra si esa pestaña ya cargó.
    const { data: empresas = [] } = useQuery<EmpresaResumen[]>({
        queryKey: queryKeys.erp.empresas(),
        queryFn: getEmpresas,
    });
    const nombreEmpresa = useMemo(() => {
        const m = new Map<number, string>();
        empresas.forEach((e) => m.set(e.id_empresa, e.empresa));
        return (id: number) => m.get(id) ?? `#${id}`;
    }, [empresas]);

    const invalidar = () => queryClient.invalidateQueries({ queryKey: QK_DESTINOS });

    const toggleStatus = useMutation({
        mutationFn: (d: Destino) =>
            destinoService.cambiarStatus(d.id_destino_whatsapp, d.id_empresa, d.status === 1 ? 0 : 1),
        onSuccess: invalidar,
    });

    const eliminar = useMutation({
        mutationFn: (d: Destino) => destinoService.eliminar(d.id_destino_whatsapp, d.id_empresa),
        onSuccess: () => { setConfirm(CONFIRM_CLOSED); invalidar(); },
    });

    const destinosFiltrados = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return destinos;
        return destinos.filter(
            (d) =>
                d.nombre.toLowerCase().includes(q) ||
                (d.telefono ?? "").includes(q) ||
                nombreEmpresa(d.id_empresa).toLowerCase().includes(q),
        );
    }, [destinos, search, nombreEmpresa]);

    return (
        <CatalogLayout>
            <CatalogHeader
                icon={MessageSquare}
                title="Destinos WhatsApp"
                subtitle={`${destinos.length} destino${destinos.length !== 1 ? "s" : ""} configurado${destinos.length !== 1 ? "s" : ""}`}
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar por nombre, teléfono o empresa..."
                onAdd={() => { setEditTarget(null); setModalAbierto(true); }}
                addLabel="Nuevo destino"
            />

            <div className="p-6">
                {isLoading && (
                    <div className="py-10 text-center text-slate-500">Cargando destinos...</div>
                )}
                {isError && (
                    <div role="alert" className="py-10 text-center text-red-500">
                        No se pudieron cargar los destinos. Intenta de nuevo.
                    </div>
                )}
                {!isLoading && !isError && destinosFiltrados.length === 0 && (
                    <div className="py-10 text-center text-slate-400">
                        {search ? "Sin resultados para tu búsqueda" : "Aún no hay destinos configurados"}
                    </div>
                )}

                {!isLoading && !isError && destinosFiltrados.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    {["Nombre", "Tipo", "Contacto", "Empresa", "Activo", "Acciones"].map((h) => (
                                        <th key={h} scope="col"
                                            className="border-b border-slate-200 px-4 py-3 text-left text-xs font-medium">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {destinosFiltrados.map((d) => (
                                    <tr key={d.id_destino_whatsapp}>
                                        <td className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">
                                            {d.nombre}
                                        </td>

                                        <td className="border-b border-slate-200 px-4 py-3">
                                            <span className={
                                                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs " +
                                                (d.tipo === "grupo"
                                                    ? "bg-blue-50 text-blue-700"
                                                    : "border border-slate-200 text-slate-600")
                                            }>
                                                {d.tipo === "grupo" ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                                                {d.tipo === "grupo" ? "Grupo" : "Persona"}
                                            </span>
                                        </td>

                                        <td className="border-b border-slate-200 px-4 py-3 text-slate-500">
                                            {d.tipo === "persona"
                                                ? d.telefono ?? "—"
                                                : d.total_participantes != null
                                                    ? `${d.total_participantes} participantes`
                                                    : "—"}
                                        </td>

                                        <td className="border-b border-slate-200 px-4 py-3 text-slate-500">
                                            {nombreEmpresa(d.id_empresa)}
                                        </td>

                                        {/* Activo: switch (como te gustaba) */}
                                        <td className="border-b border-slate-200 px-4 py-3">
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={d.status === 1}
                                                aria-label={d.status === 1 ? "Desactivar destino" : "Activar destino"}
                                                onClick={() => toggleStatus.mutate(d)}
                                                disabled={toggleStatus.isPending}
                                                className={
                                                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors " +
                                                    (d.status === 1 ? "bg-blue-600" : "bg-slate-300")
                                                }
                                            >
                                                <span className={
                                                    "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform " +
                                                    (d.status === 1 ? "translate-x-4" : "translate-x-1")
                                                } />
                                            </button>
                                        </td>

                                        {/* Acciones: Editar / Eliminar (estilo EmpresasPage) */}
                                        <td className="border-b border-slate-200 px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { setEditTarget(d); setModalAbierto(true); }}
                                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirm({ open: true, destino: d })}
                                                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                                >
                                                    Eliminar
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

            <DestinoModal
                open={modalAbierto}
                onOpenChange={setModalAbierto}
                onSaved={invalidar}
                destino={editTarget}
            />

            <ConfirmDialog
                open={confirm.open}
                onOpenChange={(open) => !open && setConfirm(CONFIRM_CLOSED)}
                title="Eliminar destino"
                description={
                    confirm.destino
                        ? `¿Eliminar "${confirm.destino.nombre}"? Dejará de recibir alertas y se quitará de la lista. Esta acción no se puede deshacer.`
                        : ""
                }
                confirmText="Eliminar"
                confirmButtonClassName="bg-red-600 hover:bg-red-700"
                onConfirm={() => confirm.destino && eliminar.mutate(confirm.destino)}
            />
        </CatalogLayout>
    );
}