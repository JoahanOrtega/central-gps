// src/features/reports/geocercas/useEventosFilters.ts
// ─────────────────────────────────────────────────────────────────────────────
// Hook que aísla TODA la lógica de filtros del componente de presentación.
//
// Responsabilidades:
//   1. Mantener el estado del formulario (lo que el usuario está editando).
//   2. Mantener los filtros aplicados (los que dispararon la última query).
//   3. Aplicar presets de período de forma consistente.
//   4. Validar localmente antes de aplicar (H5: prevención de errores).
//   5. Exponer errores por campo para feedback inline.
//
// La vista NO conoce Zod, ni cómo se construyen las fechas locales, ni los
// IDs de tipos válidos. Solo consume `form`, `errors`, `aplicar()`, etc.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo, useState } from "react";
import { APP_TIMEZONE } from "@/lib/date-time";
import type { EventosFiltros, TipoEventoGeocerca } from "./eventos.types";
import { validarFiltros } from "./eventos.schema";

// ── Helpers de fecha ─────────────────────────────────────────────────────────
// Tu vista actual los tiene inline. Aquí viven una sola vez y la vista los
// importa si los necesita para inputs adicionales.

/**
 * Convierte un Date a "YYYY-MM-DDTHH:MM" interpretado en APP_TIMEZONE.
 * El input[type=datetime-local] muestra hora local — sin esto mostraría UTC.
 */
export const toDateInputValue = (date: Date): string => {
    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: APP_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
    return fmt.format(date).replace(", ", "T");
};

/**
 * Convierte "YYYY-MM-DDTHH:MM" (hora local UTC-6) a ISO UTC absoluto.
 * Marshmallow 4 ya tolera 'Z' gracias al validator parchado, pero
 * mandamos el offset explícito por compatibilidad.
 */
const localInputToIso = (localValue: string): string => {
    if (!localValue) return "";
    const withOffset = `${localValue}:00-06:00`;
    const date = new Date(withOffset);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

// ── Presets de período ───────────────────────────────────────────────────────

export type PresetId = "hoy" | "ayer" | "7d" | "30d" | "personalizado";

interface Preset {
    id: PresetId;
    label: string;
    desde: () => Date;
    hasta: () => Date;
}

const startOfDay = (d: Date): Date => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
};

const endOfDay = (d: Date): Date => {
    const copy = new Date(d);
    copy.setHours(23, 59, 59, 0);
    return copy;
};

export const PRESETS: readonly Preset[] = [
    {
        id: "hoy",
        label: "Hoy",
        desde: () => startOfDay(new Date()),
        hasta: () => new Date(),
    },
    {
        id: "ayer",
        label: "Ayer",
        desde: () => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return startOfDay(d);
        },
        hasta: () => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return endOfDay(d);
        },
    },
    {
        id: "7d",
        label: "7 días",
        desde: () => {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            return startOfDay(d);
        },
        hasta: () => new Date(),
    },
    {
        id: "30d",
        label: "30 días",
        desde: () => {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            return startOfDay(d);
        },
        hasta: () => new Date(),
    },
] as const;

// ── Forma del formulario ─────────────────────────────────────────────────────
// El formulario usa strings porque eso es lo que devuelven los <input/>.
// La conversión a tipos (number, Date) sucede en formToFiltros().

export interface FiltrosForm {
    preset: PresetId;
    desde: string;          // "YYYY-MM-DDTHH:MM"
    hasta: string;          // "YYYY-MM-DDTHH:MM"
    id_unidad: string;      // "" o entero como string
    id_poi: string;
    tipos: TipoEventoGeocerca[];
}

const buildDefaultForm = (): FiltrosForm => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return {
        preset: "7d",
        desde: toDateInputValue(d),
        hasta: toDateInputValue(new Date()),
        id_unidad: "",
        id_poi: "",
        tipos: [],
    };
};

const formToFiltros = (form: FiltrosForm): EventosFiltros => {
    const f: EventosFiltros = { limite: 50 };
    if (form.desde) f.desde = localInputToIso(form.desde);
    if (form.hasta) f.hasta = localInputToIso(form.hasta);
    if (form.id_unidad) f.id_unidad = Number(form.id_unidad);
    if (form.id_poi) f.id_poi = Number(form.id_poi);
    if (form.tipos.length) f.tipos_evento = form.tipos;
    return f;
};

// ── Hook público ─────────────────────────────────────────────────────────────

export interface UseEventosFiltersResult {
    /** Estado actual del formulario (lo que el usuario edita) */
    form: FiltrosForm;
    /** Filtros aplicados — los que disparan la query */
    filtrosAplicados: EventosFiltros;
    /** Errores de validación inline, por campo */
    errors: Record<string, string>;
    /** True si el form actual difiere de los filtros aplicados */
    isDirty: boolean;
    /** True si el form actual pasa la validación local */
    isValid: boolean;

    setPreset: (id: PresetId) => void;
    setDesde: (value: string) => void;
    setHasta: (value: string) => void;
    setUnidad: (id: string) => void;
    setPoi: (id: string) => void;
    toggleTipo: (tipo: TipoEventoGeocerca) => void;
    setGrupoTipos: (tipos: TipoEventoGeocerca[], activos: boolean) => void;
    limpiarTipos: () => void;

    aplicar: () => boolean;       // retorna false si la validación falla
    limpiarTodo: () => void;
}

export const useEventosFilters = (): UseEventosFiltersResult => {
    const [form, setForm] = useState<FiltrosForm>(buildDefaultForm);
    const [filtrosAplicados, setFiltrosAplicados] = useState<EventosFiltros>(
        () => formToFiltros(buildDefaultForm()),
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    // ── isDirty: compara form actual con filtrosAplicados ────────────────────
    const isDirty = useMemo(() => {
        const candidato = formToFiltros(form);
        return JSON.stringify(candidato) !== JSON.stringify(filtrosAplicados);
    }, [form, filtrosAplicados]);

    // ── isValid: revalida en vivo (sin set state, sólo lectura) ──────────────
    const isValid = useMemo(() => {
        const candidato = formToFiltros(form);
        return validarFiltros(candidato).success;
    }, [form]);

    // ── Setters individuales ─────────────────────────────────────────────────
    // Cualquier edición de fecha pasa el preset a "personalizado" automáticamente.
    const setDesde = useCallback((value: string) => {
        setForm((p) => ({ ...p, desde: value, preset: "personalizado" }));
        setErrors((e) => ({ ...e, desde: "" }));
    }, []);

    const setHasta = useCallback((value: string) => {
        setForm((p) => ({ ...p, hasta: value, preset: "personalizado" }));
        setErrors((e) => ({ ...e, hasta: "" }));
    }, []);

    const setUnidad = useCallback((id: string) => {
        setForm((p) => ({ ...p, id_unidad: id }));
        setErrors((e) => ({ ...e, id_unidad: "" }));
    }, []);

    const setPoi = useCallback((id: string) => {
        setForm((p) => ({ ...p, id_poi: id }));
        setErrors((e) => ({ ...e, id_poi: "" }));
    }, []);

    const setPreset = useCallback((id: PresetId) => {
        const preset = PRESETS.find((p) => p.id === id);
        if (!preset) {
            setForm((p) => ({ ...p, preset: id }));
            return;
        }
        setForm((p) => ({
            ...p,
            preset: id,
            desde: toDateInputValue(preset.desde()),
            hasta: toDateInputValue(preset.hasta()),
        }));
        setErrors({});
    }, []);

    const toggleTipo = useCallback((tipo: TipoEventoGeocerca) => {
        setForm((p) => ({
            ...p,
            tipos: p.tipos.includes(tipo)
                ? p.tipos.filter((t) => t !== tipo)
                : [...p.tipos, tipo],
        }));
    }, []);

    const setGrupoTipos = useCallback(
        (tipos: TipoEventoGeocerca[], activos: boolean) => {
            setForm((p) => {
                if (activos) {
                    // Quitar todos los del grupo
                    return { ...p, tipos: p.tipos.filter((t) => !tipos.includes(t)) };
                }
                // Añadir los faltantes del grupo
                const nuevos = tipos.filter((t) => !p.tipos.includes(t));
                return { ...p, tipos: [...p.tipos, ...nuevos] };
            });
        },
        [],
    );

    const limpiarTipos = useCallback(() => {
        setForm((p) => ({ ...p, tipos: [] }));
    }, []);

    // ── Acciones principales ─────────────────────────────────────────────────
    const aplicar = useCallback((): boolean => {
        const candidato = formToFiltros(form);
        const result = validarFiltros(candidato);

        if (!result.success) {
            setErrors(result.errors);
            return false;
        }

        setErrors({});
        setFiltrosAplicados(candidato);
        return true;
    }, [form]);

    const limpiarTodo = useCallback(() => {
        const def = buildDefaultForm();
        setForm(def);
        setFiltrosAplicados(formToFiltros(def));
        setErrors({});
    }, []);

    return {
        form,
        filtrosAplicados,
        errors,
        isDirty,
        isValid,
        setPreset,
        setDesde,
        setHasta,
        setUnidad,
        setPoi,
        toggleTipo,
        setGrupoTipos,
        limpiarTipos,
        aplicar,
        limpiarTodo,
    };
};