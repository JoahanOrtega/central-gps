// Hook del modal de edición de unidades. Carga el detalle con TanStack Query,
// mantiene un form local con tracking de cambios (dirty), guarda solo el diff
// vía PATCH y valida permisos
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unitService } from "../services/unitService";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useAuthStore } from "@/stores/authStore";
import { queryKeys } from "@/lib/query-keys";
import { notify } from "@/stores/notificationStore";
import { toDateInputValue } from "@/lib/date-time";

import type {
    UnitDetail,
    UpdateUnitPayload,
} from "../types/unit-edit.types";

// Form vacío mientras carga el detalle, para que los inputs no pasen de
// uncontrolled a controlled (error clásico de React).
const EMPTY_FORM: UpdateUnitPayload = {};

interface UseUnitEditResult {
    detail: UnitDetail | undefined;
    isLoading: boolean;
    loadError: Error | null;

    form: UpdateUnitPayload;
    patchForm: (changes: Partial<UpdateUnitPayload>) => void;
    resetForm: () => void;

    isDirty: boolean;
    isSaving: boolean;
    saveError: string | null;

    save: () => Promise<boolean>;

    canEdit: boolean;
    canViewTechnical: boolean;
}

interface UseUnitEditOptions {
    idUnidad: number | null;
    enabled?: boolean;
}

export const useUnitEdit = ({
    idUnidad,
    enabled = true,
}: UseUnitEditOptions): UseUnitEditResult => {
    const queryClient = useQueryClient();
    const { idEmpresa } = useEmpresaActiva();

    // Permisos resueltos en el cliente solo para decidir qué mostrar; el
    // backend valida de nuevo. Si el cliente cree que puede y el backend dice
    // que no, el PATCH falla y el usuario ve el error.
    const rol = useAuthStore((state) => state.user?.rol);
    const hasPermission = useAuthStore((state) => state.hasPermission);

    const isSudo = rol === "sudo_erp";
    const canEdit = hasPermission("cund_edit");
    // Solo sudo_erp ve el equipo instalado; admin_empresa no, aunque tenga cund_edit.
    const canViewTechnical = isSudo;

    const {
        data: detail,
        isLoading,
        error: loadErrorRaw,
    } = useQuery<UnitDetail>({
        queryKey: queryKeys.units.detail(idUnidad ?? -1, idEmpresa),
        // idEmpresa va como query param para sudo_erp, cuyo JWT no tiene empresa
        // fija. El backend lo ignora para otros roles.
        queryFn: () => unitService.getDetail(idUnidad as number, idEmpresa),
        enabled: !!idUnidad && enabled && canEdit,
        staleTime: 30_000,
    });

    const loadError = loadErrorRaw instanceof Error ? loadErrorRaw : null;

    const [form, setForm] = useState<UpdateUnitPayload>(EMPTY_FORM);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [baseline, setBaseline] = useState<UpdateUnitPayload>(EMPTY_FORM);

    // Resetear el form solo cuando cambia la unidad (id_unidad), no en cada
    // refetch: TanStack a veces emite una referencia nueva de detail con los
    // mismos datos, y usar detail completo en deps pisaría los cambios del usuario.
    useEffect(() => {
        if (!detail) return;
        const initialForm = detailToFormPayload(detail);
        setForm(initialForm);
        setBaseline(initialForm);
        setSaveError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detail?.id_unidad]);

    const patchForm = useCallback((changes: Partial<UpdateUnitPayload>) => {
        setForm((prev) => ({ ...prev, ...changes }));
    }, []);

    const resetForm = useCallback(() => {
        setForm(baseline);
        setSaveError(null);
    }, [baseline]);

    const isDirty = useMemo(() => {
        const keys = new Set([
            ...Object.keys(form),
            ...Object.keys(baseline),
        ]) as Set<keyof UpdateUnitPayload>;

        for (const key of keys) {
            if (!shallowEqual(form[key], baseline[key])) return true;
        }
        return false;
    }, [form, baseline]);

    const mutation = useMutation({
        mutationFn: async () => {
            if (!idUnidad) throw new Error("Sin id de unidad");
            const diff = buildDiff(baseline, form);
            // Cortar antes de llamar al backend si no hay cambios.
            if (Object.keys(diff).length === 0) {
                return { message: "Sin cambios", actualizado: false };
            }
            return unitService.update(idUnidad, diff, idEmpresa);
        },
        onSuccess: (result) => {
            setSaveError(null);
            if (result.actualizado) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.units.detail(idUnidad as number, idEmpresa),
                });
                queryClient.invalidateQueries({ queryKey: queryKeys.units.all });
                notify.success("Unidad actualizada correctamente");
            }
        },
        onError: (err: unknown) => {
            const msg = err instanceof Error
                ? err.message
                : "No fue posible guardar los cambios";
            setSaveError(msg);
            notify.error(msg);
        },
    });

    const save = useCallback(async (): Promise<boolean> => {
        try {
            const result = await mutation.mutateAsync();
            // Tras guardar, mover el baseline al form actual para que isDirty
            // vuelva a false.
            if (result.actualizado) {
                setBaseline(form);
            }
            return true;
        } catch {
            return false;
        }
    }, [mutation, form]);

    return {
        detail,
        isLoading,
        loadError,
        form,
        patchForm,
        resetForm,
        isDirty,
        isSaving: mutation.isPending,
        saveError,
        save,
        canEdit,
        canViewTechnical,
    };
};

// Copia solo los campos editables del detalle. No incluye id_unidad, vel_max,
// status ni nombre_operador (read-only): mantenerlos fuera evita mandarlos por
// accidente. Las fechas se convierten al formato del <input type="date">.
const detailToFormPayload = (detail: UnitDetail): UpdateUnitPayload => {
    const payload: UpdateUnitPayload = {
        numero: detail.numero,
        marca: detail.marca,
        modelo: detail.modelo,
        anio: detail.anio,
        matricula: detail.matricula,
        no_serie: detail.no_serie,
        tipo: detail.tipo,
        odometro_inicial: detail.odometro_inicial,
        imagen: detail.imagen,
        id_operador: detail.id_operador,
        fecha_asignacion_operador: toDateInputValue(detail.fecha_asignacion_operador),
        id_grupo_unidades: detail.id_grupo_unidades,
        tipo_combustible: detail.tipo_combustible,
        capacidad_tanque: detail.capacidad_tanque,
        rendimiento_establecido: detail.rendimiento_establecido,
        nombre_aseguradora: detail.nombre_aseguradora,
        telefono_aseguradora: detail.telefono_aseguradora,
        no_poliza_seguro: detail.no_poliza_seguro,
        vigencia_poliza_seguro: toDateInputValue(detail.vigencia_poliza_seguro),
        vigencia_verificacion_vehicular: toDateInputValue(detail.vigencia_verificacion_vehicular),
    };

    // Campos técnicos: solo si llegaron en el detalle (usuario sudo_erp).
    // Copiarlos como undefined los mandaría al backend y ensuciaría logs.
    if ("imei" in detail) {
        payload.id_modelo_avl = detail.id_modelo_avl;
        payload.imei = detail.imei;
        payload.chip = detail.chip;
        payload.fecha_instalacion = toDateInputValue(detail.fecha_instalacion);
        payload.input1 = detail.input1;
        payload.input2 = detail.input2;
        payload.output1 = detail.output1;
        payload.output2 = detail.output2;
    }

    return payload;
};

// Diff entre baseline y form: solo los campos que cambiaron, para que el PATCH
// mande lo mínimo. Si dos personas editan campos distintos, ambos cambios
// persisten sin pisarse.
const buildDiff = (
    baseline: UpdateUnitPayload,
    current: UpdateUnitPayload,
): UpdateUnitPayload => {
    const diff: UpdateUnitPayload = {};
    const keys = new Set([
        ...Object.keys(baseline),
        ...Object.keys(current),
    ]) as Set<keyof UpdateUnitPayload>;

    for (const key of keys) {
        if (!shallowEqual(baseline[key], current[key])) {
            (diff as Record<string, unknown>)[key] = current[key];
        }
    }
    return diff;
};

// Comparación poco profunda con soporte para arrays de primitivos
// (id_grupo_unidades). null y undefined se consideran iguales (ambos "vacío").
const shallowEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (Number.isNaN(a) && Number.isNaN(b)) return true;

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((value, index) => value === b[index]);
    }

    if (a == null && b == null) return true;

    return false;
};