import { useEffect, useState } from "react";
import { MapPinned } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { poiService } from "./poiService";
import type { PoiItem, UpdatePoiPayload } from "./poi.types";
import { notify } from "@/stores/notificationStore";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { queryKeys } from "@/lib/query-keys";
import { ModalWithTabs } from "@/components/shared/ModalWithTabs";
import { Field, RadioOption, inputClass } from "@/components/shared/form-helpers";
import { GeoFenceTab, type GeoFenceValue } from "@/components/shared/GeoFenceTab";

interface EditPoiModalProps {
    /** null = cerrado | PoiItem = abierto editando ese POI */
    poi: PoiItem | null;
    onClose: () => void;
}

// Estado del formulario
interface PoiForm {
    nombre: string;
    observaciones: string;
    id_grupo_pois: number[];
    // Geometría (GeoFenceTab)
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
    // Marcador
    tipo_marker: number;
    url_marker: string;
    marker_path: string;
    marker_color: string;
    icon: string;
    icon_color: string;
}

/** Convierte un PoiItem del listado al estado del formulario */
const poiToForm = (poi: PoiItem): PoiForm => ({
    nombre: poi.nombre ?? "",
    observaciones: poi.observaciones ?? "",
    id_grupo_pois: [],  // Se pre-seleccionarán cuando el backend lo soporte
    tipo_poi: poi.tipo_poi ?? 1,
    direccion: poi.direccion ?? "",
    direccionEsAproximada: false,
    lat: poi.lat,
    lng: poi.lng,
    radio: poi.radio ?? 50,
    bounds: poi.bounds ?? "",
    area: poi.area ?? "",
    polygon_path: poi.polygon_path ?? "",
    polygon_color: poi.polygon_color ?? "#5e6383",
    radio_color: poi.radio_color ?? "#5e6383",
    tipo_marker: poi.tipo_marker ?? 0,
    url_marker: poi.url_marker ?? "pin.svg",
    marker_path: poi.marker_path ?? "MAP_PIN",
    marker_color: poi.marker_color ?? "#5e6383",
    icon: poi.icon ?? "la la-industry",
    icon_color: poi.icon_color ?? "#FFFFFF",
});

const safeParsePolygon = (polygonPath: string) => {
    try {
        const parsed = JSON.parse(polygonPath);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const EditPoiModal = ({ poi, onClose }: EditPoiModalProps) => {
    const { idEmpresa } = useEmpresaActiva();
    const queryClient = useQueryClient();

    const [form, setForm] = useState<PoiForm | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("general");

    // Grupos cacheados para el selector de asignación
    const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
        queryKey: queryKeys.pois.groups(idEmpresa),
        queryFn: () => poiService.getPoiGroups("", idEmpresa),
        enabled: !!idEmpresa && poi !== null,
        staleTime: 5 * 60 * 1000,
    });

    // Sincronizar formulario cuando se abre con un POI distinto
    useEffect(() => {
        if (poi) {
            setForm(poiToForm(poi));
            setActiveTab("general");
            setError("");
        }
    }, [poi]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;
        const numericFields = ["tipo_poi", "tipo_marker", "radio"];
        setForm((prev) =>
            prev ? { ...prev, [name]: numericFields.includes(name) ? Number(value) : value } : prev,
        );
        if (error) setError("");
    };

    const handleGroupChange = (groupId: number) => {
        setForm((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                id_grupo_pois: prev.id_grupo_pois.includes(groupId)
                    ? prev.id_grupo_pois.filter((id) => id !== groupId)
                    : [...prev.id_grupo_pois, groupId],
            };
        });
    };

    const handleReset = () => {
        if (poi) setForm(poiToForm(poi));
        setError("");
        setActiveTab("general");
    };

    const handleSubmit = async () => {
        if (!form || !poi) return;

        setIsLoading(true);
        setError("");
        try {
            if (!form.nombre.trim()) {
                setError("El nombre es requerido");
                setActiveTab("general");
                return;
            }
            if (!form.direccion.trim()) {
                setError("Debes definir el domicilio del punto de interés");
                setActiveTab("address");
                return;
            }
            if (form.tipo_poi === 2) {
                const parsed = safeParsePolygon(form.polygon_path);
                if (parsed.length < 3) {
                    setError("Para una geocerca poligonal debes marcar al menos 3 puntos");
                    setActiveTab("address");
                    return;
                }
            }

            // Solo mandamos los campos que el backend acepta en PATCH
            const payload: UpdatePoiPayload = {
                nombre: form.nombre.trim(),
                direccion: form.direccion.trim() || null,
                observaciones: form.observaciones.trim() || null,
                tipo_poi: form.tipo_poi,
                lat: form.lat,
                lng: form.lng,
                radio: form.radio,
                bounds: form.bounds || null,
                polygon_path: form.polygon_path || null,
                polygon_color: form.polygon_color,
                radio_color: form.radio_color,
                tipo_marker: form.tipo_marker,
                url_marker: form.url_marker || null,
                marker_path: form.marker_path || null,
                marker_color: form.marker_color,
                icon: form.icon || null,
                icon_color: form.icon_color,
                id_grupo_pois: form.id_grupo_pois,
            };

            await poiService.updatePoi(poi.id_poi, payload, idEmpresa);
            await queryClient.invalidateQueries({ queryKey: queryKeys.pois.all });
            notify.success(`Punto de interés "${form.nombre}" actualizado correctamente`);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "No fue posible actualizar el POI");
        } finally {
            setIsLoading(false);
        }
    };

    // GeoFenceValue para el tab de domicilio
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
                label: "Datos del Punto",
                content: (
                    <PoiGeneralTab
                        form={form}
                        groups={groups}
                        isLoadingGroups={isLoadingGroups}
                        onChange={handleInputChange}
                        onGroupChange={handleGroupChange}
                    />
                ),
            },
            {
                id: "address",
                label: "Domicilio",
                content: geoValue ? (
                    <GeoFenceTab
                        value={geoValue}
                        onChange={(values) => setForm((prev) => (prev ? { ...prev, ...values } : prev))}
                        required
                        extraFields={
                            <PoiExtraFields form={form} onChange={handleInputChange} />
                        }
                    />
                ) : null,
            },
        ]
        : [
            {
                id: "general",
                label: "Datos del Punto",
                content: (
                    <div className="flex items-center justify-center py-16 text-sm text-slate-500">
                        Cargando punto de interés...
                    </div>
                ),
            },
        ];

    return (
        <ModalWithTabs
            open={poi !== null}
            onOpenChange={(open) => !open && onClose()}
            title="Editar Punto de Interés"
            icon={MapPinned}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSave={handleSubmit}
            onReset={handleReset}
            isLoading={isLoading}
            saveLabel="Guardar cambios"
            error={error}
            confirmCloseDescription="Si cierras, perderás los cambios sin guardar. ¿Deseas cerrar?"
        />
    );
};

// Tab Datos del Punto

interface PoiGeneralTabProps {
    form: PoiForm;
    groups: { id_grupo_pois: number; nombre: string }[];
    isLoadingGroups: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onGroupChange: (groupId: number) => void;
}

const PoiGeneralTab = ({
    form, groups, isLoadingGroups, onChange, onGroupChange,
}: PoiGeneralTabProps) => (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
        <section className="space-y-5">
            <Field label="Nombre *">
                <input name="nombre" value={form.nombre} onChange={onChange} className={inputClass} />
            </Field>

            <Field label="Asignar Grupos de POI">
                <div className="rounded border border-slate-300 bg-white p-3">
                    <div className="max-h-72 space-y-2 overflow-y-auto">
                        {isLoadingGroups && <p className="text-sm text-slate-500">Cargando grupos...</p>}
                        {!isLoadingGroups && groups.length === 0 && (
                            <p className="text-sm text-slate-500">No hay grupos de POIs disponibles</p>
                        )}
                        {!isLoadingGroups && groups.map((group) => (
                            <label key={group.id_grupo_pois} className="flex items-center gap-3 rounded px-2 py-2 hover:bg-slate-50">
                                <input
                                    type="checkbox"
                                    checked={form.id_grupo_pois.includes(group.id_grupo_pois)}
                                    onChange={() => onGroupChange(group.id_grupo_pois)}
                                    className="h-4 w-4"
                                />
                                <span className="text-sm text-slate-700">{group.nombre}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </Field>

            <Field label="Observaciones">
                <textarea
                    name="observaciones"
                    value={form.observaciones}
                    onChange={onChange}
                    className="min-h-32 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
            </Field>
        </section>

        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5">
            <h3 className="text-sm font-semibold text-slate-700">Resumen del punto</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p><span className="font-medium text-slate-700">Nombre:</span> {form.nombre || "---"}</p>
                <p><span className="font-medium text-slate-700">Grupos:</span> {form.id_grupo_pois.length}</p>
                <p><span className="font-medium text-slate-700">Observaciones:</span> {form.observaciones || "---"}</p>
            </div>
        </aside>
    </div>
);

// Campos del tab Domicilio (marcador y colores)

interface PoiExtraFieldsProps {
    form: PoiForm;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PoiExtraFields = ({ form, onChange }: PoiExtraFieldsProps) => (
    <>
        {form.tipo_poi === 1 && (
            <>
                <Field label="Marcador *">
                    <div className="flex flex-wrap items-center gap-4 pt-2 md:gap-6">
                        <RadioOption checked label="Predefinido" onClick={() => { }} />
                        <RadioOption checked={false} label="Crear Nuevo" onClick={() => { }} />
                    </div>
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
                    <Field label="Color">
                        <input name="radio_color" value={form.radio_color} onChange={onChange} className={inputClass} />
                    </Field>
                </div>

                <Field label="Marcador">
                    <input name="url_marker" value={form.url_marker} onChange={onChange} className={inputClass} />
                </Field>
            </>
        )}

        {form.tipo_poi === 2 && (
            <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Color">
                        <input name="polygon_color" value={form.polygon_color} onChange={onChange} className={inputClass} />
                    </Field>
                </div>
                <label className="flex items-center gap-3 text-sm text-slate-600">
                    <input type="checkbox" className="h-4 w-4" />
                    Ocultar líneas y marcador guía
                </label>
            </>
        )}
    </>
);