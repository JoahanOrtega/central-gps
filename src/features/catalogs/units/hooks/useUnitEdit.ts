// ─────────────────────────────────────────────────────────────────────────────
// Hook useUnitEdit
// ─────────────────────────────────────────────────────────────────────────────
//
// Encapsula toda la lógica del modal de edición de unidades:
//
//   1. CARGA: fetch del detalle (GET /units/:id) con TanStack Query.
//      Caché de 30 segundos — si el usuario abre el mismo modal 2 veces
//      seguidas, la segunda es instantánea.
//
//   2. ESTADO: form local con los campos editables. Se inicializa desde
//      el detalle cargado. Tracking de "dirty" (qué cambió respecto al
//      original) para:
//        - Habilitar/deshabilitar el botón "Guardar"
//        - Mostrar badge "cambios sin guardar"
//        - Advertir si el usuario intenta cerrar con cambios pendientes
//
//   3. GUARDADO: PATCH solo con los campos que cambiaron. Invalida el
//      caché del detalle + el de la lista de unidades tras éxito.
//
//   4. PERMISOS: resuelve si el usuario puede editar o si el modal va
//      en modo solo lectura. Mirror de la lógica del backend — ambos
//      lados deben coincidir para que la UX sea predecible.
//
// Por qué no useReducer: el estado es un objeto plano con un setter
// parcial (patchForm). useState + una función helper es más simple y
// se lee mejor para un Jr. useReducer brilla cuando hay transiciones
// complejas entre estados, no es el caso aquí.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unitService } from "../services/unitService";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useAuthStore } from "@/stores/authStore";
import { queryKeys } from "@/lib/query-keys";
import { notify } from "@/stores/notificationStore";

import type {
    UnitDetail,
    UpdateUnitPayload,
} from "../types/unit-edit.types";

// ── Valor inicial del form cuando aún no cargó el detalle ────────────────────
// Evita que los inputs del modal sean "uncontrolled → controlled" (error
// clásico de React). Mientras isLoading, el form está con strings vacíos.
const EMPTY_FORM: UpdateUnitPayload = {};

// ── Tipos del retorno del hook ───────────────────────────────────────────────
interface UseUnitEditResult {
    // Detalle cargado del backend (readonly, referencia original)
    detail: UnitDetail | undefined;
    isLoading: boolean;
    loadError: Error | null;

    // Form editable y helpers
    form: UpdateUnitPayload;
    patchForm: (changes: Partial<UpdateUnitPayload>) => void;
    resetForm: () => void;

    // Estado derivado para la UI
    isDirty: boolean;            // hay cambios sin guardar
    isSaving: boolean;           // request PATCH en vuelo
    saveError: string | null;    // último error del guardado (ya parseado)

    // Acciones
    save: () => Promise<boolean>;   // retorna true si se guardó OK

    // Permisos resueltos (mirror del backend)
    canEdit: boolean;            // ¿el usuario puede modificar?
    canViewTechnical: boolean;   // ¿muestro la sección "Equipo Instalado"?
}

interface UseUnitEditOptions {
    idUnidad: number | null;    // null cuando el modal está cerrado
    enabled?: boolean;           // para desactivar el fetch explícitamente
}

export const useUnitEdit = ({
    idUnidad,
    enabled = true,
}: UseUnitEditOptions): UseUnitEditResult => {
    const queryClient = useQueryClient();
    const { idEmpresa } = useEmpresaActiva();

    // ── Permisos resueltos en el cliente (debe coincidir con backend) ──────
    // El backend valida permisos en el decorador + en el servicio. Aquí
    // solo decidimos qué MOSTRAR. Si el cliente cree que puede y el
    // backend dice que no, el PATCH falla y el usuario ve el error —
    // pero nunca dejamos que el frontend "mienta" al usuario.
    const rol = useAuthStore((state) => state.user?.rol);
    const hasPermission = useAuthStore((state) => state.hasPermission);

    const isSudo = rol === "sudo_erp";
    // canEdit = tiene el permiso cund_edit. El store expande automáticamente
    // el caso sudo_erp (bypass) — no hay que verificarlo aquí.
    const canEdit = hasPermission("cund_edit");
    // canViewTechnical = solo sudo_erp ve el equipo instalado.
    // admin_empresa NO lo ve aunque tenga cund_edit.
    const canViewTechnical = isSudo;

    // ── Query: cargar el detalle ────────────────────────────────────────────
    const {
        data: detail,
        isLoading,
        error: loadErrorRaw,
    } = useQuery<UnitDetail>({
        queryKey: queryKeys.units.detail(idUnidad ?? -1, idEmpresa),
        // Pasamos idEmpresa como query param — necesario para sudo_erp cuyo
        // JWT no tiene empresa fija. El backend ignora el parámetro si el rol
        // no es sudo_erp (usa el del JWT y valida que coincida).
        queryFn: () => unitService.getDetail(idUnidad as number, idEmpresa),
        // Solo disparar el fetch si hay id, está habilitado y el usuario
        // puede ver el detalle. Sin esto, abrir el modal con idUnidad=null
        // (cerrado) dispararía GET /units/-1 innecesariamente.
        enabled: !!idUnidad && enabled && canEdit,
        // 30s: durante el modal abierto no revalidamos en background. Cuando
        // se cierra y vuelve a abrir en <30s, se ve instantáneo.
        staleTime: 30_000,
    });

    const loadError = loadErrorRaw instanceof Error ? loadErrorRaw : null;

    // ── Estado del form ─────────────────────────────────────────────────────
    // Se inicializa al cargar el detalle. El useEffect abajo lo sincroniza
    // cada vez que llega un nuevo detail (cambio de unidad o refetch).
    const [form, setForm] = useState<UpdateUnitPayload>(EMPTY_FORM);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Snapshot del valor original para calcular `isDirty`. Se rehidrata
    // cuando llega un detail distinto.
    const [baseline, setBaseline] = useState<UpdateUnitPayload>(EMPTY_FORM);

    // Cuando cambia el detail, reinicia el form al valor del servidor.
    // Usamos SOLO id_unidad como dependencia (no el objeto detail completo)
    // para evitar resets destructivos: TanStack Query en algunos refetches
    // emite una referencia nueva del objeto aunque los datos sean iguales,
    // y si tuviéramos `detail` en deps, esto pisaría los cambios del usuario
    // cada vez que ocurra un refetch en background.
    //
    // El eslint-disable es consciente: leemos `detail` dentro del effect
    // (vía el closure) pero el reset debe ocurrir solo cuando cambia la
    // unidad (otro id_unidad), no cuando cambia la referencia del objeto.
    useEffect(() => {
        if (!detail) return;
        const initialForm = detailToFormPayload(detail);
        setForm(initialForm);
        setBaseline(initialForm);
        setSaveError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detail?.id_unidad]);

    // ── Helpers de form ─────────────────────────────────────────────────────
    // patchForm permite actualizar campos individualmente:
    //   patchForm({ matricula: "ABC-123" })
    //   patchForm({ id_operador: 5, fecha_asignacion_operador: "2024-01-01" })
    const patchForm = useCallback((changes: Partial<UpdateUnitPayload>) => {
        setForm((prev) => ({ ...prev, ...changes }));
    }, []);

    // Revierte cambios al valor del servidor sin re-fetchear.
    const resetForm = useCallback(() => {
        setForm(baseline);
        setSaveError(null);
    }, [baseline]);

    // ── Dirty tracking ──────────────────────────────────────────────────────
    // Comparamos cada campo del form con el baseline. La comparación es
    // shallow porque los campos son primitivos (excepto id_grupo_unidades
    // que es un array — ese lo comparamos por longitud + contenido).
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

    // ── Mutation: guardar cambios ────────────────────────────────────────────
    // Construye el diff (solo campos cambiados) y llama al PATCH.
    // Invalida el detail y la lista al terminar con éxito.
    const mutation = useMutation({
        mutationFn: async () => {
            if (!idUnidad) throw new Error("Sin id de unidad");
            const diff = buildDiff(baseline, form);
            // No llamar al backend si no hay cambios — el endpoint responde
            // 400 "No hay campos para actualizar", pero mejor cortar antes.
            if (Object.keys(diff).length === 0) {
                return { message: "Sin cambios", actualizado: false };
            }
            return unitService.update(idUnidad, diff, idEmpresa);
        },
        onSuccess: (result) => {
            setSaveError(null);
            if (result.actualizado) {
                // Invalidar el detalle (para la próxima apertura del modal)
                // y la lista (para que las cards se actualicen).
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
            // Tras un guardado exitoso, mover el baseline al form actual
            // para que isDirty vuelva a ser false.
            if (result.actualizado) {
                setBaseline(form);
            }
            return true;
        } catch {
            // onError ya setteó saveError y notificó
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers puros — extraídos para poder testearlos si en el futuro se quiere
// ─────────────────────────────────────────────────────────────────────────────

// Copia los campos editables del detalle a un payload de update.
// IMPORTANTE: no copiamos id_unidad, vel_max, status, nombre_operador
// porque NO son editables — vivir separados previene bugs donde se
// mande accidentalmente un campo read-only.
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
        fecha_asignacion_operador: detail.fecha_asignacion_operador,
        id_grupo_unidades: detail.id_grupo_unidades,
        tipo_combustible: detail.tipo_combustible,
        capacidad_tanque: detail.capacidad_tanque,
        rendimiento_establecido: detail.rendimiento_establecido,
        nombre_aseguradora: detail.nombre_aseguradora,
        telefono_aseguradora: detail.telefono_aseguradora,
        no_poliza_seguro: detail.no_poliza_seguro,
        vigencia_poliza_seguro: detail.vigencia_poliza_seguro,
        vigencia_verificacion_vehicular: detail.vigencia_verificacion_vehicular,
    };

    // Campos técnicos: solo copiarlos si llegaron en el detalle (significa
    // que el usuario es sudo_erp). Si se copiaran con undefined, se
    // mandarían al backend como tal y causarían ruido en logs.
    if ("imei" in detail) {
        payload.id_modelo_avl = detail.id_modelo_avl;
        payload.imei = detail.imei;
        payload.chip = detail.chip;
        payload.fecha_instalacion = detail.fecha_instalacion;
        payload.input1 = detail.input1;
        payload.input2 = detail.input2;
        payload.output1 = detail.output1;
        payload.output2 = detail.output2;
    }

    return payload;
};

// Construye el diff entre baseline y current: solo incluye campos
// que cambiaron. Esto hace que el PATCH mande lo mínimo posible —
// patrón fundamental para colaboración multi-usuario (si dos personas
// editan campos distintos, ambos cambios persisten sin pisarse).
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
            // TypeScript no puede probar que el tipo del value coincide con
            // el tipo de la key en la union — un cast guiado mantiene el
            // runtime correcto sin perder type-safety afuera del helper.
            (diff as Record<string, unknown>)[key] = current[key];
        }
    }
    return diff;
};

// Comparación poco profunda con soporte para arrays de primitivos
// (necesario para id_grupo_unidades). NaN === NaN por diseño (raro
// en este dominio, pero elimina un edge case si llegara a pasar).
const shallowEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (Number.isNaN(a) && Number.isNaN(b)) return true;

    // Ambos arrays: comparar longitud y elementos
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((value, index) => value === b[index]);
    }

    // null/undefined se consideran iguales entre sí (tratamos ambos como
    // "vacío" en contexto de form)
    if (a == null && b == null) return true;

    return false;
};