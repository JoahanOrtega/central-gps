import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { clientService } from "./clientService";
import type { ClientItem, ClientFieldErrors } from "./client.types";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { notify } from "@/stores/notificationStore";
import { queryKeys } from "@/lib/query-keys";
import { ModalWithTabs } from "@/components/shared/ModalWithTabs";
import { Field, inputClass } from "@/components/shared/form-helpers";
import { GeoFenceTab, type GeoFenceValue } from "@/components/shared/GeoFenceTab";

interface EditClientModalProps {
    /** id del cliente a editar; null = modal cerrado */
    idCliente: number | null;
    onClose: () => void;
    onSuccess: () => void;
}

// Misma estructura que el form de NewClientModal
interface ClientForm {
    clave: string;
    nombre: string;
    contacto: string;
    telefono: string;
    email: string;
    observaciones: string;
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

/** Convierte los datos del backend al estado del formulario */
const clientToForm = (client: ClientItem): ClientForm => {
    // Preferir el objeto poi completo (trae tipo_poi, radio, bounds, polígono).
    // Fallback: parsear "lat,lng" de coordenadas para clientes viejos cuyo
    // detalle no incluya el poi armado.
    const poi = client.poi;

    let lat: number | null = poi?.lat ?? null;
    let lng: number | null = poi?.lng ?? null;
    if (lat === null && client.coordenadas) {
        // coordenadas viene como "lat,lng" del JOIN. Si el cliente no tiene POI,
        // el CONCAT del backend produce "," (partes vacías) → hay que ignorarlo,
        // porque Number("") es 0 y pondría el mapa en (0,0) en el océano.
        const parts = client.coordenadas.split(",");
        if (parts.length >= 2 && parts[0].trim() !== "" && parts[1].trim() !== "") {
            const parsedLat = Number(parts[0]);
            const parsedLng = Number(parts[1]);
            if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
                lat = parsedLat;
                lng = parsedLng;
            }
        }
    }

    return {
        clave: client.clave ?? "",
        nombre: client.nombre ?? "",
        contacto: client.contacto ?? "",
        telefono: client.telefono ?? "",
        email: client.email ?? "",
        observaciones: client.observaciones ?? "",
        tipo_poi: poi?.tipo_poi ?? 1,
        direccion: poi?.direccion ?? client.direccion ?? "",
        direccionEsAproximada: false,
        lat,
        lng,
        radio: poi?.radio ?? 50,
        bounds: poi?.bounds ?? "",
        area: poi?.area ?? "",
        polygon_path: poi?.polygon_path ?? "",
        polygon_color: poi?.polygon_color ?? "#5e6383",
        radio_color: poi?.radio_color ?? "#5e6383",
    };
};

export const EditClientModal = ({ idCliente, onClose, onSuccess }: EditClientModalProps) => {
    const { idEmpresa } = useEmpresaActiva();

    const [form, setForm] = useState<ClientForm | null>(null);
    const [errors, setErrors] = useState<ClientFieldErrors>({});
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("general");
    const [isLoading, setIsLoading] = useState(false);

    // Cargar el cliente completo cuando se abre el modal
    const { data: client, isLoading: cargando, error: errorCarga } = useQuery<ClientItem>({
        queryKey: queryKeys.catalogs.clientDetail(idCliente ?? 0, idEmpresa),
        queryFn: () => clientService.getById(idCliente!, idEmpresa),
        enabled: idCliente !== null && !!idEmpresa,
    });

    // Sincronizar formulario cuando llegan los datos
    useEffect(() => {
        if (client) {
            setForm(clientToForm(client));
            setActiveTab("general");
            setError("");
            setErrors({});
        }
    }, [client]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        setForm((prev) => (prev ? { ...prev, [name]: value } : prev));
        if (errors[name as keyof ClientFieldErrors]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
        if (error) setError("");
    };

    const handleReset = () => {
        if (client) setForm(clientToForm(client));
        setErrors({});
        setError("");
        setActiveTab("general");
    };

    const validate = (): boolean => {
        if (!form) return false;
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
        if (!form || !idCliente) return;
        if (!validate()) return;

        setIsLoading(true);
        setError("");
        try {
            await clientService.update(idCliente, {
                clave: form.clave.trim(),
                nombre: form.nombre.trim(),
                contacto: form.contacto.trim() || null,
                telefono: form.telefono.trim() || null,
                email: form.email.trim() || null,
                observaciones: form.observaciones.trim() || null,
                // Domicilio: solo se envía si hay punto en el mapa. El backend
                // actualiza el POI existente o crea uno nuevo según corresponda.
                ...(form.lat !== null &&
                    form.lng !== null && {
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
            }, idEmpresa);

            notify.success(`Cliente "${form.nombre}" actualizado correctamente`);
            onSuccess();
            onClose();
        } catch (err) {
            if (err instanceof Error && err.message.includes("CLAVE_TAKEN")) {
                setErrors({ clave: ["Esta clave ya está en uso en tu empresa"] });
                setActiveTab("general");
                return;
            }
            setError(err instanceof Error ? err.message : "No fue posible actualizar el cliente");
        } finally {
            setIsLoading(false);
        }
    };

    const geoValue: GeoFenceValue | null = form
        ? {
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
        }
        : null;

    const tabs = form
        ? [
            {
                id: "general",
                label: "Datos del Cliente",
                content: (
                    <ClientGeneralTab form={form} errors={errors} onChange={handleChange} />
                ),
            },
            {
                id: "ubicacion",
                label: "Ubicación",
                content: geoValue ? (
                    <GeoFenceTab
                        value={geoValue}
                        onChange={(values) => setForm((prev) => (prev ? { ...prev, ...values } : prev))}
                        infoSlot={
                            form.lat !== null && form.lng !== null ? (
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                                    <p>Lat: {form.lat.toFixed(6)}</p>
                                    <p>Lng: {form.lng.toFixed(6)}</p>
                                </div>
                            ) : null
                        }
                    />
                ) : null,
            },
        ]
        : [
            {
                id: "general",
                label: "Datos del Cliente",
                content: (
                    <div className="flex items-center justify-center py-16 text-sm text-slate-500">
                        {cargando && "Cargando cliente..."}
                        {errorCarga && "No se pudo cargar el cliente. Intenta de nuevo."}
                    </div>
                ),
            },
        ];

    return (
        <ModalWithTabs
            open={idCliente !== null}
            onOpenChange={(open) => !open && onClose()}
            title="Editar Cliente"
            icon={Building2}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSave={handleSubmit}
            onReset={handleReset}
            isLoading={isLoading || cargando}
            saveLabel="Guardar cambios"
            error={error}
            confirmCloseDescription="Si cierras, perderás los cambios sin guardar. ¿Deseas cerrar?"
        />
    );
};

// ── Tab Datos del Cliente (reutilizado de NewClientModal) ─────────────────────

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