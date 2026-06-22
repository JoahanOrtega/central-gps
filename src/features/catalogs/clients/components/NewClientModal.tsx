import { useState } from "react";
import { Building2 } from "lucide-react";
import { clientService } from "../services/clientService";
import type { ClientFieldErrors } from "../types/client.types";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { notify } from "@/stores/notificationStore";
import { ModalWithTabs } from "@/components/shared/ModalWithTabs";
import { Field, inputClass } from "@/components/shared/form-helpers";
import { GeoFenceTab, type GeoFenceValue } from "@/components/shared/GeoFenceTab";

interface NewClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ClientForm {
  // Tab Datos del Cliente
  clave: string;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  observaciones: string;
  //Tab Ubicación
  tipo_poi: number;
  direccion: string;
  direccionEsAproximada: boolean;
  lat: number | null;
  lng: number | null;
  radio: number;
  bounds: string;
  area: string;
  polygon_path: string;
  polygon_color: string;
  radio_color: string;
}

const EMPTY_FORM: ClientForm = {
  clave: "",
  nombre: "",
  contacto: "",
  telefono: "",
  email: "",
  observaciones: "",
  tipo_poi: 1,
  direccion: "",
  direccionEsAproximada: false,
  lat: null,
  lng: null,
  radio: 50,
  bounds: "",
  area: "",
  polygon_path: "",
  polygon_color: "#5e6383",
  radio_color: "#5e6383",
};

export const NewClientModal = ({
  open,
  onOpenChange,
  onSuccess,
}: NewClientModalProps) => {
  const { idEmpresa } = useEmpresaActiva();

  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<ClientFieldErrors>({});
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ClientFieldErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (error) setError("");
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setError("");
    setActiveTab("general");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) handleReset();
    onOpenChange(next);
  };

  const validate = (): boolean => {
    const newErrors: ClientFieldErrors = {};
    if (!form.clave.trim()) newErrors.clave = ["La clave es requerida"];
    if (!form.nombre.trim()) newErrors.nombre = ["El nombre es requerido"];
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = ["Ingresa un email válido"];
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setActiveTab("general");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    setError("");
    try {
      await clientService.create({
        clave: form.clave.trim(),
        nombre: form.nombre.trim(),
        contacto: form.contacto.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        observaciones: form.observaciones.trim() || null,
        id_empresa: idEmpresa ?? undefined,
        // Datos de ubicación
        ...(form.lat !== null && form.lng !== null && {
          poi: {
            tipo_poi: form.tipo_poi,
            direccion: form.direccion,
            lat: form.lat,
            lng: form.lng,
            radio: form.radio,
            bounds: form.bounds,
            area: form.area,
            polygon_path: form.polygon_path,
            polygon_color: form.polygon_color,
            radio_color: form.radio_color,
          },
        }),
      });

      notify.success(`Cliente "${form.nombre}" creado correctamente`);
      onSuccess();
      handleOpenChange(false);

    } catch (err) {
      if (err instanceof Error && err.message.includes("CLAVE_TAKEN")) {
        setErrors({ clave: ["Esta clave ya está en uso en tu empresa"] });
        setActiveTab("general");
        return;
      }
      setError(err instanceof Error ? err.message : "No fue posible crear el cliente");
    } finally {
      setIsLoading(false);
    }
  };

  // GeoFenceValue extrae los campos de geometría del form para pasarlos al tab
  const geoValue: GeoFenceValue = {
    tipo_poi: form.tipo_poi,
    direccion: form.direccion,
    direccionEsAproximada: form.direccionEsAproximada,
    lat: form.lat,
    lng: form.lng,
    radio: form.radio,
    bounds: form.bounds,
    area: form.area,
    polygon_path: form.polygon_path,
    polygon_color: form.polygon_color,
    radio_color: form.radio_color,
  };

  const tabs = [
    {
      id: "general",
      label: "Datos del Cliente",
      content: (
        <ClientGeneralTab
          form={form}
          errors={errors}
          onChange={handleChange}
        />
      ),
    },
    {
      id: "ubicacion",
      label: "Ubicación",
      content: (
        // La ubicación es opcional
        <GeoFenceTab
          value={geoValue}
          onChange={(values) => setForm((prev) => ({ ...prev, ...values }))}
          infoSlot={
            form.lat !== null && form.lng !== null ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                <p>Lat: {form.lat.toFixed(6)}</p>
                <p>Lng: {form.lng.toFixed(6)}</p>
              </div>
            ) : null
          }
        />
      ),
    },
  ];

  return (
    <ModalWithTabs
      open={open}
      onOpenChange={handleOpenChange}
      title="Nuevo Cliente"
      icon={Building2}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSave={handleSubmit}
      onReset={handleReset}
      isLoading={isLoading}
      error={error}
      confirmCloseDescription="Al cerrar, perderás la información capturada. ¿Deseas cerrar el formulario?"
    />
  );
};

// Tab Datos del Cliente

interface ClientGeneralTabProps {
  form: ClientForm;
  errors: ClientFieldErrors;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const ClientGeneralTab = ({ form, errors, onChange }: ClientGeneralTabProps) => (
  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
    <section className="space-y-5">

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Clave *">
          <input
            name="clave"
            value={form.clave}
            onChange={onChange}
            maxLength={50}
            placeholder="Ej. CLI-001"
            className={`${inputClass} ${errors.clave ? "border-red-300 bg-red-50" : ""}`}
          />
          {errors.clave && (
            <p className="mt-1 text-xs text-red-600">{errors.clave[0]}</p>
          )}
        </Field>

        <Field label="Nombre *">
          <input
            name="nombre"
            value={form.nombre}
            onChange={onChange}
            maxLength={200}
            placeholder="Nombre del cliente"
            className={`${inputClass} ${errors.nombre ? "border-red-300 bg-red-50" : ""}`}
          />
          {errors.nombre && (
            <p className="mt-1 text-xs text-red-600">{errors.nombre[0]}</p>
          )}
        </Field>
      </div>

      <Field label="Contacto">
        <input
          name="contacto"
          value={form.contacto}
          onChange={onChange}
          maxLength={200}
          placeholder="Nombre de la persona de contacto"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Teléfono">
          <input
            name="telefono"
            type="tel"
            value={form.telefono}
            onChange={onChange}
            maxLength={50}
            placeholder="Ej. 449 123 4567"
            className={inputClass}
          />
        </Field>

        <Field label="Email">
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            maxLength={100}
            placeholder="correo@ejemplo.com"
            className={`${inputClass} ${errors.email ? "border-red-300 bg-red-50" : ""}`}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email[0]}</p>
          )}
        </Field>
      </div>

      <Field label="Observaciones">
        <textarea
          name="observaciones"
          value={form.observaciones}
          onChange={onChange}
          rows={4}
          placeholder="Notas adicionales sobre el cliente..."
          className="min-h-24 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
      </Field>
    </section>

    <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5">
      <h3 className="text-sm font-semibold text-slate-700">Resumen del cliente</h3>
      <div className="mt-4 space-y-3 text-sm text-slate-600">
        <p><span className="font-medium text-slate-700">Clave:</span> {form.clave || "---"}</p>
        <p><span className="font-medium text-slate-700">Nombre:</span> {form.nombre || "---"}</p>
        <p><span className="font-medium text-slate-700">Contacto:</span> {form.contacto || "---"}</p>
        <p><span className="font-medium text-slate-700">Teléfono:</span> {form.telefono || "---"}</p>
        <p><span className="font-medium text-slate-700">Email:</span> {form.email || "---"}</p>
      </div>
    </aside>
  </div>
);