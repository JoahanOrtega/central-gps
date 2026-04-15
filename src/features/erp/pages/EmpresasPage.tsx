// Módulo de gestión de empresas del panel ERP.
// Lista todas las empresas con sus métricas y permite crear, editar y suspender.

import { useEffect, useState } from "react";
import { getEmpresas, toggleEmpresaStatus, createEmpresa, updateEmpresa } from "../services/erpService";
import type { EmpresaResumen, EmpresaFormData } from "../types/erp.types";

// ── Componente principal ──────────────────────────────────
export const EmpresasPage = () => {
    const [empresas, setEmpresas] = useState<EmpresaResumen[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Modal de creación/edición
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<EmpresaResumen | null>(null);

    const cargarEmpresas = async () => {
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
    };

    useEffect(() => { cargarEmpresas(); }, []);

    // Activar / suspender empresa
    const handleToggleStatus = async (empresa: EmpresaResumen) => {
        const nuevoStatus = empresa.status === 1 ? 0 : 1;
        const accion = nuevoStatus === 0 ? "suspender" : "activar";
        if (!confirm(`¿Deseas ${accion} la empresa "${empresa.empresa}"?`)) return;
        try {
            await toggleEmpresaStatus(empresa.id_empresa, nuevoStatus as 0 | 1);
            await cargarEmpresas();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Error al cambiar status");
        }
    };

    const handleOpenCreate = () => { setEditTarget(null); setModalOpen(true); };
    const handleOpenEdit = (emp: EmpresaResumen) => { setEditTarget(emp); setModalOpen(true); };

    const handleModalSave = async (data: EmpresaFormData) => {
        try {
            if (editTarget) {
                await updateEmpresa(editTarget.id_empresa, data);
            } else {
                await createEmpresa(data);
            }
            setModalOpen(false);
            await cargarEmpresas();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Error al guardar");
        }
    };

    // ── Render ──
    return (
        <div>
            {/* Encabezado */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 600, color: "#0f172a", margin: 0 }}>Empresas</h1>
                    <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                        {empresas.length} empresa{empresas.length !== 1 ? "s" : ""} registradas
                    </p>
                </div>
                <button onClick={handleOpenCreate} style={btnPrimary}>
                    + Nueva empresa
                </button>
            </div>

            {/* Estado de carga / error */}
            {loading && <p style={{ color: "#64748b", fontSize: 14 }}>Cargando...</p>}
            {error && <p style={{ color: "#dc2626", fontSize: 14 }}>{error}</p>}

            {/* Tabla de empresas */}
            {!loading && !error && (
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                {["Empresa", "Unidades", "Usuarios", "Clientes", "Status", "Acciones"].map((h) => (
                                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontWeight: 500, color: "#475569", fontSize: 12 }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {empresas.map((emp) => (
                                <tr key={emp.id_empresa} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "12px 16px" }}>
                                        <p style={{ fontWeight: 500, color: "#0f172a", margin: 0 }}>{emp.empresa}</p>
                                        {emp.email_principal && (
                                            <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>{emp.email_principal}</p>
                                        )}
                                    </td>
                                    <td style={{ padding: "12px 16px", color: "#475569" }}>{emp.total_unidades}</td>
                                    <td style={{ padding: "12px 16px", color: "#475569" }}>{emp.total_usuarios}</td>
                                    <td style={{ padding: "12px 16px", color: "#475569" }}>{emp.total_clientes}</td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <span style={{
                                            fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 20,
                                            background: emp.status === 1 ? "#dcfce7" : "#fee2e2",
                                            color: emp.status === 1 ? "#166534" : "#991b1b",
                                        }}>
                                            {emp.status === 1 ? "Activa" : "Suspendida"}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button onClick={() => handleOpenEdit(emp)} style={btnSecondary}>
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(emp)}
                                                style={{ ...btnSecondary, color: emp.status === 1 ? "#dc2626" : "#16a34a" }}
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

            {/* Modal crear / editar */}
            {modalOpen && (
                <EmpresaModal
                    empresa={editTarget}
                    onSave={handleModalSave}
                    onClose={() => setModalOpen(false)}
                />
            )}
        </div>
    );
};

// ── Modal de creación / edición ───────────────────────────
interface EmpresaModalProps {
    empresa: EmpresaResumen | null;
    onSave: (data: EmpresaFormData) => Promise<void>;
    onClose: () => void;
}

const EmpresaModal = ({ empresa, onSave, onClose }: EmpresaModalProps) => {
    const [form, setForm] = useState<EmpresaFormData>({
        nombre: empresa?.empresa ?? "",
        direccion: "",
        telefonos: "",
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!form.nombre.trim()) { alert("El nombre es obligatorio"); return; }
        setSaving(true);
        await onSave(form);
        setSaving(false);
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,.15)" }}>
                <h2 style={{ fontSize: 17, fontWeight: 600, color: "#0f172a", margin: "0 0 20px" }}>
                    {empresa ? "Editar empresa" : "Nueva empresa"}
                </h2>

                {(["nombre", "direccion", "telefonos"] as const).map((campo) => (
                    <div key={campo} style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 12, fontWeight: 500, color: "#475569", display: "block", marginBottom: 5, textTransform: "capitalize" }}>
                            {campo}{campo === "nombre" ? " *" : ""}
                        </label>
                        <input
                            value={form[campo] ?? ""}
                            onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                            style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
                        />
                    </div>
                ))}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                    <button onClick={onClose} style={btnSecondary} disabled={saving}>Cancelar</button>
                    <button onClick={handleSubmit} style={btnPrimary} disabled={saving}>
                        {saving ? "Guardando..." : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Estilos reutilizables ─────────────────────────────────
const btnPrimary: React.CSSProperties = {
    padding: "8px 16px", borderRadius: 8, border: "none",
    background: "#1d4ed8", color: "#fff", fontSize: 13,
    fontWeight: 500, cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
    padding: "7px 14px", borderRadius: 7,
    border: "1px solid #e2e8f0", background: "#fff",
    color: "#475569", fontSize: 12, cursor: "pointer",
};