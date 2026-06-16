import { useState } from "react";
import { UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { operatorService } from "./operatorService";
import { unitService } from "@/features/catalogs/units/services/unitService";
import type { OperatorFieldErrors } from "./operator.types";
import {
    type OperatorForm,
    EMPTY_OPERATOR_FORM,
    OperatorGeneralTab,
    OperatorLicenseTab,
    type SelectOption,
} from "./OperatorFormTabs";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { notify } from "@/stores/notificationStore";
import { queryKeys } from "@/lib/query-keys";
import { ModalWithTabs } from "@/components/shared/ModalWithTabs";

interface NewOperatorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export const NewOperatorModal = ({
    open,
    onOpenChange,
    onSuccess,
}: NewOperatorModalProps) => {
    const { idEmpresa } = useEmpresaActiva();

    const [form, setForm] = useState<OperatorForm>(EMPTY_OPERATOR_FORM);
    const [errors, setErrors] = useState<OperatorFieldErrors>({});
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("general");
    const [isLoading, setIsLoading] = useState(false);

    // Opciones de los selects: grupos y unidades de la empresa.
    // Solo se cargan cuando el modal está abierto (enabled: open).
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

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: name === "id_unidad" ? Number(value) : value,
        }));
        if (errors[name as keyof OperatorFieldErrors]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
        if (error) setError("");
    };

    const handleGruposChange = (ids: number[]) => {
        setForm((prev) => ({ ...prev, id_grupo_operadores: ids }));
    };

    const handleReset = () => {
        setForm(EMPTY_OPERATOR_FORM);
        setErrors({});
        setError("");
        setActiveTab("general");
    };

    const handleOpenChange = (next: boolean) => {
        if (!next) handleReset();
        onOpenChange(next);
    };

    const validate = (): boolean => {
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
        if (!validate()) return;

        setIsLoading(true);
        setError("");
        try {
            // 1. Crear el operador con sus datos + grupos.
            const { operador } = await operatorService.create(
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
                },
                idEmpresa,
            );

            // 2. Si se eligió unidad, asignarla (relación exclusiva vía procedure).
            if (form.id_unidad > 0 && operador?.id_operador) {
                await operatorService.assign(
                    operador.id_operador,
                    { id_unidad: form.id_unidad },
                    idEmpresa,
                );
            }

            notify.success(`Operador "${form.nombre}" creado correctamente`);
            onSuccess();
            handleOpenChange(false);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "No fue posible crear el operador",
            );
        } finally {
            setIsLoading(false);
        }
    };

    const tabs = [
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
                <OperatorLicenseTab form={form} errors={errors} onChange={handleChange} />
            ),
        },
    ];

    return (
        <ModalWithTabs
            open={open}
            onOpenChange={handleOpenChange}
            title="Nuevo Operador"
            icon={UserRound}
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