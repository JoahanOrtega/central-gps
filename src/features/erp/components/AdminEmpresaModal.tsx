// Modal para que el sudo_erp cree un usuario admin de una empresa.
//
// Usa el mismo patrón de EmpresaModal (Dialog de shadcn/ui):
//   - Focus trap automático
//   - Cierre con Escape integrado
//   - aria labels para accesibilidad
//
// Validaciones:
//   - Frontend: feedback inmediato al usuario (UX)
//   - Backend: validación real con marshmallow CreateEmpresaAdminSchema
//
// Las reglas de validación están alineadas con el backend. Si el backend
// cambia, este archivo también debe actualizarse. La validación frontend
// nunca reemplaza la del backend — solo evita ida y vuelta innecesarios.

import { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import type { AdminEmpresaFormData } from "../types/erp.types";

// ── Props ─────────────────────────────────────────────────────────────────────
interface AdminEmpresaModalProps {
    // Nombre de la empresa — se muestra en el título para contexto del admin.
    empresaNombre: string;
    onSave: (data: AdminEmpresaFormData) => Promise<void>;
    onClose: () => void;
}

// ── Estado inicial del formulario ─────────────────────────────────────────────
const INITIAL_FORM: AdminEmpresaFormData = {
    usuario: "",
    clave: "",
    nombre: "",
    email: "",
    telefono: "",
};

// ── Errores por campo ─────────────────────────────────────────────────────────
// Mapa específico por campo — permite mostrar feedback preciso debajo de cada
// input en vez de un único mensaje global.
type FieldErrors = Partial<Record<keyof AdminEmpresaFormData, string>>;

// ── Validación local ──────────────────────────────────────────────────────────
// Reglas alineadas con el backend (validators/erp_validators.py).
// Se valida antes del submit para evitar requests innecesarios — la validación
// real ocurre en el backend.
const validateForm = (form: AdminEmpresaFormData): FieldErrors => {
    const errors: FieldErrors = {};

    const usuario = form.usuario.trim();
    if (!usuario) {
        errors.usuario = "El nombre de usuario es obligatorio";
    } else if (usuario.length < 3) {
        errors.usuario = "El nombre de usuario debe tener al menos 3 caracteres";
    } else if (usuario.length > 100) {
        errors.usuario = "El nombre de usuario no puede exceder 100 caracteres";
    }

    if (!form.clave) {
        errors.clave = "La contraseña es obligatoria";
    } else if (form.clave.length < 8) {
        errors.clave = "La contraseña debe tener al menos 8 caracteres";
    } else if (form.clave.length > 128) {
        errors.clave = "La contraseña no puede exceder 128 caracteres";
    }

    const nombre = form.nombre.trim();
    if (!nombre) {
        errors.nombre = "El nombre es obligatorio";
    } else if (nombre.length < 2) {
        errors.nombre = "El nombre debe tener al menos 2 caracteres";
    } else if (nombre.length > 150) {
        errors.nombre = "El nombre no puede exceder 150 caracteres";
    }

    // Email opcional, pero si se proporciona debe tener formato válido
    if (form.email && form.email.trim()) {
        // Regex pragmático — no cubre 100% de RFC 5322 (imposible sin un parser),
        // pero sí los formatos reales que un humano escribe. La validación
        // exhaustiva la hace marshmallow.Email en el backend.
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(form.email.trim())) {
            errors.email = "Formato de email inválido";
        }
    }

    return errors;
};


// ── Componente ────────────────────────────────────────────────────────────────
export const AdminEmpresaModal = ({
    empresaNombre,
    onSave,
    onClose,
}: AdminEmpresaModalProps) => {
    const [form, setForm] = useState<AdminEmpresaFormData>(INITIAL_FORM);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [saving, setSaving] = useState(false);

    // Enfocar el primer campo al abrir (UX: teclado)
    const usuarioRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const timer = setTimeout(() => usuarioRef.current?.focus(), 0);
        return () => clearTimeout(timer);
    }, []);

    // ── Handler genérico: actualiza el campo y limpia el error asociado ──────
    // Evita duplicar la misma lógica en 5 onChange distintos.
    const handleChange = <K extends keyof AdminEmpresaFormData>(
        field: K,
        value: AdminEmpresaFormData[K],
    ) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const handleSubmit = async () => {
        // 1. Validar localmente — feedback inmediato sin request al backend
        const validationErrors = validateForm(form);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            // Enfocar el primer campo con error (mejora la UX de teclado)
            const firstErrorField = Object.keys(validationErrors)[0];
            document.getElementById(`admin-${firstErrorField}`)?.focus();
            return;
        }

        // 2. Normalizar el payload: trim strings y convertir vacíos a null
        //    para campos opcionales. El backend ignora null sin problema.
        const payload: AdminEmpresaFormData = {
            usuario: form.usuario.trim(),
            clave: form.clave,  // contraseñas NUNCA se recortan
            nombre: form.nombre.trim(),
            email: form.email?.trim() || null,
            telefono: form.telefono?.trim() || null,
        };

        setSaving(true);
        try {
            await onSave(payload);
            // onSave cierra el modal desde el componente padre si tuvo éxito
        } finally {
            setSaving(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[460px] rounded-2xl p-7">

                <DialogHeader>
                    <DialogTitle className="text-base font-semibold text-slate-800">
                        Nuevo administrador
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Crear usuario administrador para{" "}
                        <span className="font-medium text-slate-700">{empresaNombre}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-3.5">

                    {/* ── Usuario (requerido) ── */}
                    <div>
                        <label htmlFor="admin-usuario" className="mb-1.5 block text-xs font-medium text-slate-500">
                            Usuario <span className="text-red-400" aria-hidden="true">*</span>
                        </label>
                        <input
                            ref={usuarioRef}
                            id="admin-usuario"
                            value={form.usuario}
                            onChange={(e) => handleChange("usuario", e.target.value)}
                            placeholder="nombre de login"
                            autoComplete="off"
                            aria-required="true"
                            aria-invalid={!!errors.usuario}
                            aria-describedby={errors.usuario ? "admin-usuario-error" : undefined}
                            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400 ${errors.usuario ? "border-red-400" : "border-slate-200"
                                }`}
                        />
                        {errors.usuario && (
                            <p id="admin-usuario-error" role="alert" className="mt-1 text-xs text-red-500">
                                {errors.usuario}
                            </p>
                        )}
                    </div>

                    {/* ── Nombre (requerido) ── */}
                    <div>
                        <label htmlFor="admin-nombre" className="mb-1.5 block text-xs font-medium text-slate-500">
                            Nombre <span className="text-red-400" aria-hidden="true">*</span>
                        </label>
                        <input
                            id="admin-nombre"
                            value={form.nombre}
                            onChange={(e) => handleChange("nombre", e.target.value)}
                            placeholder="Nombre completo"
                            aria-required="true"
                            aria-invalid={!!errors.nombre}
                            aria-describedby={errors.nombre ? "admin-nombre-error" : undefined}
                            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400 ${errors.nombre ? "border-red-400" : "border-slate-200"
                                }`}
                        />
                        {errors.nombre && (
                            <p id="admin-nombre-error" role="alert" className="mt-1 text-xs text-red-500">
                                {errors.nombre}
                            </p>
                        )}
                    </div>

                    {/* ── Contraseña (requerida) ── */}
                    <div>
                        <label htmlFor="admin-clave" className="mb-1.5 block text-xs font-medium text-slate-500">
                            Contraseña <span className="text-red-400" aria-hidden="true">*</span>
                        </label>
                        <input
                            id="admin-clave"
                            type="password"
                            value={form.clave}
                            onChange={(e) => handleChange("clave", e.target.value)}
                            placeholder="mínimo 8 caracteres"
                            autoComplete="new-password"
                            aria-required="true"
                            aria-invalid={!!errors.clave}
                            aria-describedby={errors.clave ? "admin-clave-error" : undefined}
                            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400 ${errors.clave ? "border-red-400" : "border-slate-200"
                                }`}
                        />
                        {errors.clave && (
                            <p id="admin-clave-error" role="alert" className="mt-1 text-xs text-red-500">
                                {errors.clave}
                            </p>
                        )}
                    </div>

                    {/* ── Email (opcional) ── */}
                    <div>
                        <label htmlFor="admin-email" className="mb-1.5 block text-xs font-medium text-slate-500">
                            Email
                        </label>
                        <input
                            id="admin-email"
                            type="email"
                            value={form.email ?? ""}
                            onChange={(e) => handleChange("email", e.target.value)}
                            placeholder="contacto@empresa.com"
                            autoComplete="off"
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? "admin-email-error" : undefined}
                            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400 ${errors.email ? "border-red-400" : "border-slate-200"
                                }`}
                        />
                        {errors.email && (
                            <p id="admin-email-error" role="alert" className="mt-1 text-xs text-red-500">
                                {errors.email}
                            </p>
                        )}
                    </div>

                    {/* ── Teléfono (opcional) ── */}
                    <div>
                        <label htmlFor="admin-telefono" className="mb-1.5 block text-xs font-medium text-slate-500">
                            Teléfono
                        </label>
                        <input
                            id="admin-telefono"
                            value={form.telefono ?? ""}
                            onChange={(e) => handleChange("telefono", e.target.value)}
                            placeholder="Opcional"
                            autoComplete="off"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                        />
                    </div>

                </div>

                {/* ── Acciones ── */}
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? "Creando..." : "Crear administrador"}
                    </button>
                </div>

            </DialogContent>
        </Dialog>
    );
};