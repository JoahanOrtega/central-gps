// Componente modal para crear o editar una empresa del panel ERP.
// Separado de EmpresasPage para cumplir el principio de responsabilidad única:
// cada archivo tiene un solo motivo para cambiar.

import { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import type { EmpresaResumen, EmpresaFormData } from "../types/erp.types";

// ── Props ─────────────────────────────────────────────────────────────────────
interface EmpresaModalProps {
    // null = modo creación | EmpresaResumen = modo edición
    empresa: EmpresaResumen | null;
    onSave: (data: EmpresaFormData) => Promise<void>;
    onClose: () => void;
}

// ── Estado inicial del formulario ─────────────────────────────────────────────
// EmpresaResumen es un resumen del dashboard — solo contiene nombre y métricas,
// no incluye dirección ni teléfonos porque la vista del backend no los retorna.
// En modo edición, pre-poblamos solo el nombre (disponible en el resumen).
// Dirección y teléfonos quedan vacíos — el usuario los completa si desea editarlos.
//
// Si en el futuro el backend retorna estos campos en el resumen, agregar
// direccion y telefonos a EmpresaResumen y actualizar getInitialForm.
const getInitialForm = (empresa: EmpresaResumen | null): EmpresaFormData => ({
    nombre: empresa?.empresa ?? "",
    direccion: "",
    telefonos: "",
});

// ── Componente ────────────────────────────────────────────────────────────────
export const EmpresaModal = ({ empresa, onSave, onClose }: EmpresaModalProps) => {
    const [form, setForm] = useState<EmpresaFormData>(() => getInitialForm(empresa));
    const [saving, setSaving] = useState(false);
    const [fieldError, setFieldError] = useState("");

    // Ref para enfocar el campo nombre al abrir — mejora la experiencia de teclado
    // y cumple el principio de UX: el foco va al primer campo interactivo.
    const nombreRef = useRef<HTMLInputElement>(null);

    // Enfocar el campo nombre cuando el modal se monta.
    // El setTimeout de 0 permite que el Dialog complete su animación de apertura
    // antes de intentar enfocar, evitando que el foco quede en el overlay.
    useEffect(() => {
        const timer = setTimeout(() => nombreRef.current?.focus(), 0);
        return () => clearTimeout(timer);
    }, []);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, nombre: e.target.value }));
        // Limpiar el error en cuanto el usuario empieza a escribir —
        // no esperar al siguiente submit para confirmar que el error desapareció
        if (fieldError) setFieldError("");
    };

    const handleSubmit = async () => {
        // Validar antes del submit y enfocar el campo con error
        if (!form.nombre.trim()) {
            setFieldError("El nombre de la empresa es obligatorio");
            nombreRef.current?.focus();
            return;
        }

        setFieldError("");
        setSaving(true);

        try {
            await onSave(form);
        } finally {
            // Siempre liberar el estado de guardado, incluso si onSave lanzó error.
            // El error se maneja en EmpresasPage que muestra el ConfirmDialog.
            setSaving(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    // Usa el componente Dialog de shadcn/ui en lugar de un div manual:
    // - Focus trap automático: el foco no puede escapar al contenido de atrás
    // - Cierre con Escape integrado
    // - role="dialog" y aria-modal="true" para lectores de pantalla
    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[440px] rounded-2xl p-7">

                <DialogHeader>
                    <DialogTitle className="text-base font-semibold text-slate-800">
                        {empresa ? "Editar empresa" : "Nueva empresa"}
                    </DialogTitle>
                    {/* DialogDescription requerido por accesibilidad —
                        describe el propósito del modal para lectores de pantalla.
                        sr-only: visible para lectores pero no en pantalla. */}
                    <DialogDescription className="sr-only">
                        {empresa
                            ? `Formulario para editar los datos de ${empresa.empresa}`
                            : "Formulario para registrar una nueva empresa en el sistema"
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-4">

                    {/* ── Campo nombre (requerido) ── */}
                    <div>
                        <label
                            htmlFor="empresa-nombre"
                            className="mb-1.5 block text-xs font-medium text-slate-500"
                        >
                            Nombre <span className="text-red-400" aria-hidden="true">*</span>
                        </label>
                        <input
                            ref={nombreRef}
                            id="empresa-nombre"
                            value={form.nombre}
                            onChange={handleNombreChange}
                            placeholder="Nombre de la empresa"
                            aria-required="true"
                            aria-invalid={!!fieldError}
                            aria-describedby={fieldError ? "empresa-nombre-error" : undefined}
                            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400 ${fieldError ? "border-red-400" : "border-slate-200"
                                }`}
                        />
                        {/* role="alert" anuncia el error inmediatamente a lectores de pantalla */}
                        {fieldError && (
                            <p
                                id="empresa-nombre-error"
                                role="alert"
                                className="mt-1 text-xs text-red-500"
                            >
                                {fieldError}
                            </p>
                        )}
                    </div>

                    {/* ── Campo dirección (opcional) ── */}
                    <div>
                        <label
                            htmlFor="empresa-direccion"
                            className="mb-1.5 block text-xs font-medium text-slate-500"
                        >
                            Dirección
                        </label>
                        <input
                            id="empresa-direccion"
                            value={form.direccion ?? ""}
                            onChange={(e) =>
                                setForm((prev) => ({ ...prev, direccion: e.target.value }))
                            }
                            placeholder="Dirección de la empresa"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                        />
                    </div>

                    {/* ── Campo teléfonos (opcional) ── */}
                    <div>
                        <label
                            htmlFor="empresa-telefonos"
                            className="mb-1.5 block text-xs font-medium text-slate-500"
                        >
                            Teléfonos
                        </label>
                        <input
                            id="empresa-telefonos"
                            value={form.telefonos ?? ""}
                            onChange={(e) =>
                                setForm((prev) => ({ ...prev, telefonos: e.target.value }))
                            }
                            placeholder="Teléfonos de contacto"
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
                        {saving ? "Guardando..." : "Guardar empresa"}
                    </button>
                </div>

            </DialogContent>
        </Dialog>
    );
};