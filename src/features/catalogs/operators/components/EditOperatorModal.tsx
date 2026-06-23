import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { operatorService } from "../services/operatorService";
import { unitService } from "@/features/catalogs/units/services/unitService";
import type { OperatorItem, OperatorFieldErrors } from "../services/operator.types";
import {
    type OperatorForm,
    OperatorGeneralTab,
    OperatorLicenseTab,
    type SelectOption,
} from "./OperatorFormTabs";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { notify } from "@/stores/notificationStore";
import { queryKeys } from "@/lib/query-keys";
import { ModalWithTabs } from "@/components/shared/ModalWithTabs";
import { GeoFenceTab, type GeoFenceValue } from "@/components/shared/GeoFenceTab";

interface EditOperatorModalProps {
    /** id del operador a editar; null = modal cerrado */
    idOperador: number | null;
    onClose: () => void;
    onSuccess: () => void;
}

/** Convierte los datos del backend al estado del formulario. */
const operatorToForm = (op: OperatorItem): OperatorForm => ({
    nombre: op.nombre ?? "",
    clave: op.clave && op.clave !== "0" ? op.clave : "",
    telefono: op.telefono ?? "",
    direccion: op.direccion ?? "",
    fecha_nacimiento: op.fecha_nacimiento ?? "",
    licencia: op.licencia ?? "",
    tipo_licencia: op.tipo_licencia ?? "",
    vencimiento_licencia: op.vencimiento_licencia ?? "",
    id_grupo_operadores: op.id_grupo_operadores ?? [],
    // El backend liga la unidad vía r_unidad_operador; aquí mostramos la actual
    // si existe. La asignación real se resuelve por el procedure al guardar.
    id_unidad: op.id_unidad_operador ?? 0,
    // Domicilio (geocerca): se puebla desde op.poi si el operador tiene uno.
    // Si no, quedan los valores por defecto (sin geocerca). La dirección del
    // POI tiene prioridad sobre la del operador para el GeoFenceTab.
    tipo_poi: op.poi?.tipo_poi ?? 1,
    direccionEsAproximada: false,
    lat: op.poi?.lat ?? null,
    lng: op.poi?.lng ?? null,
    radio: op.poi?.radio ?? 50,
    bounds: op.poi?.bounds ?? "",
    area: op.poi?.area ?? "",
    polygon_path: op.poi?.polygon_path ?? "",
    polygon_color: op.poi?.polygon_color ?? "#5e6383",
    radio_color: op.poi?.radio_color ?? "#5e6383",
});

export const EditOperatorModal = ({
    idOperador,
    onClose,
    onSuccess,
}: EditOperatorModalProps) => {
    const { idEmpresa } = useEmpresaActiva();

    const [form, setForm] = useState<OperatorForm | null>(null);
    const [errors, setErrors] = useState<OperatorFieldErrors>({});
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("general");
    const [isLoading, setIsLoading] = useState(false);

    const open = idOperador !== null;

    const {
        data: operator,
        isLoading: cargando,
        error: errorCarga,
    } = useQuery<OperatorItem>({
        queryKey: queryKeys.catalogs.operatorDetail(idOperador ?? 0, idEmpresa),
        queryFn: () => operatorService.getById(idOperador!, idEmpresa),
        enabled: open && !!idEmpresa,
    });

    const { data: grupos = [] } = useQuery({
        queryKey: queryKeys.catalogs.operatorGroups(idEmpresa),
        queryFn: () => operatorService.listGroups("", idEmpresa),
        enabled: open && !!idEmpresa,
    });

    const { data: unidades = [] } = useQuery({
        queryKey: ["units", "options", idEmpresa],
        queryFn: () => unitService.getUnits("", idEmpresa),
        enabled: open && !!idEmpresa,
    });

    const grupoOptions: SelectOption[] = grupos.map((g) => ({
        label: g.nombre,
        value: g.id_grupo_operadores,
    }));

    const unidadOptions: SelectOption[] = unidades.map((u) => ({
        label: `[${u.numero}] ${u.marca} ${u.modelo}`.trim(),
        value: u.id,
    }));

    // Poblar el form cuando llegan los datos.
    useEffect(() => {
        if (operator) setForm(operatorToForm(operator));
    }, [operator]);

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value } = e.target;
        setForm((prev) =>
            prev
                ? { ...prev, [name]: name === "id_unidad" ? Number(value) : value }
                : prev,
        );
        if (errors[name as keyof OperatorFieldErrors]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
        if (error) setError("");
    };

    const handleGruposChange = (ids: number[]) => {
        setForm((prev) => (prev ? { ...prev, id_grupo_operadores: ids } : prev));
    };

    const handleClose = () => {
        setForm(null);
        setErrors({});
        setError("");
        setActiveTab("general");
        onClose();
    };

    // En edición, restablecer vuelve a los datos originales del operador.
    const handleReset = () => {
        if (operator) setForm(operatorToForm(operator));
        setErrors({});
        setError("");
    };

    const validate = (): boolean => {
        if (!form) return false;
        const newErrors: OperatorFieldErrors = {};
        if (!form.nombre.trim()) newErrors.nombre = ["El nombre es requerido"];
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            setActiveTab("general");
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!form || !validate() || idOperador === null) return;

        setIsLoading(true);
        setError("");
        try {
            // 1. Actualizar datos + grupos.
            await operatorService.update(
                idOperador,
                {
                    nombre: form.nombre.trim(),
                    clave: form.clave.trim() || null,
                    telefono: form.telefono.trim() || null,
                    direccion: form.direccion.trim() || null,
                    fecha_nacimiento: form.fecha_nacimiento || null,
                    licencia: form.licencia.trim() || null,
                    tipo_licencia: form.tipo_licencia.trim() || null,
                    vencimiento_licencia: form.vencimiento_licencia || null,
                    id_grupo_operadores: form.id_grupo_operadores,
                    // Domicilio: si hay punto en el mapa, el backend actualiza el POI
                    // existente o crea uno nuevo según corresponda.
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
                },
                idEmpresa,
            );

            // 2. Sincronizar la asignación de unidad solo si cambió.
            const unidadOriginal = operator?.id_unidad_operador ?? 0;
            if (form.id_unidad !== unidadOriginal) {
                if (form.id_unidad > 0) {
                    await operatorService.assign(
                        idOperador,
                        { id_unidad: form.id_unidad },
                        idEmpresa,
                    );
                } else {
                    await operatorService.unassign(idOperador, idEmpresa);
                }
            }

            notify.success(`Operador "${form.nombre}" actualizado`);
            onSuccess();
            handleClose();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "No fue posible actualizar el operador",
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Geocerca: extrae los campos de geometría del form para el GeoFenceTab.
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
                label: "Datos generales",
                content: (
                    <OperatorGeneralTab
                        form={form}
                        errors={errors}
                        onChange={handleChange}
                        grupoOptions={grupoOptions}
                        unidadOptions={unidadOptions}
                        onGruposChange={handleGruposChange}
                    />
                ),
            },
            {
                id: "licencia",
                label: "Licencia",
                content: (
                    <OperatorLicenseTab
                        form={form}
                        errors={errors}
                        onChange={handleChange}
                    />
                ),
            },
            {
                id: "domicilio",
                label: "Domicilio",
                content: geoValue ? (
                    <GeoFenceTab
                        value={geoValue}
                        onChange={(values) =>
                            setForm((prev) => (prev ? { ...prev, ...values } : prev))
                        }
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
        : [];

    return (
        <ModalWithTabs
            open={open}
            onOpenChange={(next) => {
                if (!next) handleClose();
            }}
            title="Editar Operador"
            icon={UserRound}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSave={handleSubmit}
            onReset={handleReset}
            isLoading={isLoading || cargando}
            saveLabel="Guardar cambios"
            error={
                error ||
                (errorCarga instanceof Error ? "No se pudo cargar el operador" : "")
            }
            confirmCloseDescription="Al cerrar, perderás los cambios sin guardar. ¿Deseas cerrar el formulario?"
        />
    );
};