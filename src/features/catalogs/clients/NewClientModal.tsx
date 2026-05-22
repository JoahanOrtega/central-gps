import { useState } from "react";
import { X, Building2, Loader2 } from "lucide-react";
import { clientService } from "./clientService";
import type { ClientFieldErrors } from "./client.types";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { notify } from "@/stores/notificationStore";

interface NewClientModalProps {
  onClose:   () => void;
  onSuccess: () => void;
}

// Valores iniciales del form
const EMPTY_FORM = {
  clave:         "",
  nombre:        "",
  contacto:      "",
  telefono:      "",
  email:         "",
  observaciones: "",
};

export const NewClientModal = ({ onClose, onSuccess }: NewClientModalProps) => {
  const { idEmpresa } = useEmpresaActiva();

  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState<ClientFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Actualizar campo del form y limpiar error de ese campo (si existía)
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ClientFieldErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Validación del lado del cliente antes de enviar el request.
  const validate = (): boolean => {
    const newErrors: ClientFieldErrors = {};

    if (!form.clave.trim()) {
      newErrors.clave = ["La clave es requerida"];
    }
    if (!form.nombre.trim()) {
      newErrors.nombre = ["El nombre es requerido"];
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = ["Ingresa un email válido"];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await clientService.create({
        clave:         form.clave.trim(),
        nombre:        form.nombre.trim(),
        contacto:      form.contacto.trim()      || null,
        telefono:      form.telefono.trim()      || null,
        email:         form.email.trim()         || null,
        observaciones: form.observaciones.trim() || null,
      });

      notify.success(`Cliente "${form.nombre}" creado correctamente`);
      onSuccess();

    } catch (err) {
      // 409 CLAVE_TAKEN
      if (err instanceof Error && err.message.includes("CLAVE_TAKEN")) {
        setErrors({ clave: ["Esta clave ya está en uso en tu empresa"] });
        return;
      }
      // Cualquier otro error notificación global
      notify.error(
        err instanceof Error ? err.message : "No fue posible crear el cliente",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderizado
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        // Solo cerrar si el click fue sobre el overlay, no el contenido
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">

        {/* Header del modal */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <Building2 className="h-4 w-4 text-slate-500" />
            </div>
            <h2 id="modal-title" className="text-base font-semibold text-slate-800">
              Nuevo Cliente
            </h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 px-6 py-5">

            {/* Clave + Nombre en la misma fila */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="clave"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Clave <span className="text-red-500">*</span>
                </label>
                <input
                  id="clave"
                  name="clave"
                  type="text"
                  value={form.clave}
                  onChange={handleChange}
                  maxLength={50}
                  placeholder="Ej. CLI-001"
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 ${
                    errors.clave
                      ? "border-red-300 bg-red-50"
                      : "border-slate-200 bg-white"
                  }`}
                />
                {errors.clave && (
                  <p className="mt-1 text-xs text-red-600">{errors.clave[0]}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="nombre"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  value={form.nombre}
                  onChange={handleChange}
                  maxLength={200}
                  placeholder="Nombre del cliente"
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 ${
                    errors.nombre
                      ? "border-red-300 bg-red-50"
                      : "border-slate-200 bg-white"
                  }`}
                />
                {errors.nombre && (
                  <p className="mt-1 text-xs text-red-600">{errors.nombre[0]}</p>
                )}
              </div>
            </div>

            {/* Contacto */}
            <div>
              <label
                htmlFor="contacto"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Contacto
              </label>
              <input
                id="contacto"
                name="contacto"
                type="text"
                value={form.contacto}
                onChange={handleChange}
                maxLength={200}
                placeholder="Nombre de la persona de contacto"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Teléfono + Email en la misma fila */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="telefono"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Teléfono
                </label>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={handleChange}
                  maxLength={50}
                  placeholder="Ej. 449 123 4567"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="correo@ejemplo.com"
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 ${
                    errors.email
                      ? "border-red-300 bg-red-50"
                      : "border-slate-200 bg-white"
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email[0]}</p>
                )}
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label
                htmlFor="observaciones"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Observaciones
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                rows={3}
                placeholder="Notas adicionales sobre el cliente..."
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

          </div>

          {/* Footer del modal */}
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 active:scale-95"
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};