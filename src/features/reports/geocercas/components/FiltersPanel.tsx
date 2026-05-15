// Panel lateral de filtros.
//   - Renderizar header con icono y título "Filtros"
//   - Renderizar PeriodPresets (presets de fecha)
//   - Renderizar inputs de fecha desde/hasta con feedback inline de errores
//   - Renderizar selects de unidad y POI
//   - Renderizar EventTypeChips
//   - Renderizar botones "Filtrar" y "Limpiar"
//
// NO conoce: cómo se valida, cómo se convierten las fechas, qué tipos existen.

import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PeriodPresets } from "./PeriodPresets";
import { EventTypeChips } from "./EventTypeChips";
import type { UseEventosFiltersResult } from "../useEventosFilters";

interface UnidadOption {
    id: number;
    numero: string;
    marca: string;
}

interface PoiOption {
    id_poi: number;
    nombre: string;
}

interface FiltersPanelProps {
    /** Bundle completo del hook useEventosFilters — se inyecta tal cual */
    filters: UseEventosFiltersResult;
    /** Opciones para el select de unidad */
    unidades: UnidadOption[];
    /** Opciones para el select de POI */
    pois: PoiOption[];
}

export const FiltersPanel = ({ filters, unidades, pois }: FiltersPanelProps) => {
    const {
        form,
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
    } = filters;

    return (
        <aside className="w-full shrink-0 overflow-y-auto border-b border-slate-200 bg-slate-50 p-4 lg:w-64 lg:border-b-0 lg:border-r lg:p-5">
            <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-700">Filtros</h2>
            </div>

            <div className="space-y-5">
                {/* ── Período ────────────────────────────────────────────── */}
                <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Período
                    </label>

                    <PeriodPresets activeId={form.preset} onSelect={setPreset} />

                    <div className="space-y-2">
                        <FilterDateInput
                            id="desde"
                            label="Inicio"
                            value={form.desde}
                            error={errors.desde}
                            onChange={setDesde}
                        />
                        <FilterDateInput
                            id="hasta"
                            label="Fin"
                            value={form.hasta}
                            error={errors.hasta}
                            onChange={setHasta}
                        />
                    </div>
                </div>

                {/* ── Unidad ─────────────────────────────────────────────── */}
                <FilterSelect
                    id="filter-unidad"
                    label="Unidad"
                    value={form.id_unidad}
                    onChange={setUnidad}
                    options={[
                        { value: "", label: "— Todas —" },
                        ...unidades.map((u) => ({
                            value: String(u.id),
                            label: `${u.numero}${u.marca ? ` · ${u.marca}` : ""}`,
                        })),
                    ]}
                />

                {/* ── Punto de Interés ───────────────────────────────────── */}
                <FilterSelect
                    id="filter-poi"
                    label="Punto de Interés"
                    value={form.id_poi}
                    onChange={setPoi}
                    options={[
                        { value: "", label: "— Todos —" },
                        ...pois.map((p) => ({
                            value: String(p.id_poi),
                            label: p.nombre,
                        })),
                    ]}
                />

                {/* ── Tipo de evento ─────────────────────────────────────── */}
                <EventTypeChips
                    selected={form.tipos}
                    onToggle={toggleTipo}
                    onToggleGroup={setGrupoTipos}
                    onClearAll={limpiarTipos}
                />

                {/* ── Acciones ───────────────────────────────────────────── */}
                <div className="space-y-2 pt-1 border-t border-slate-200">
                    <Button
                        type="button"
                        onClick={aplicar}
                        disabled={!isDirty || !isValid}
                        className="w-full"
                    >
                        Filtrar
                    </Button>

                    {Object.keys(errors).length > 0 && (
                        <p className="text-xs text-amber-700">
                            Revisa los campos marcados antes de continuar
                        </p>
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        onClick={limpiarTodo}
                        className="w-full"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Limpiar
                    </Button>
                </div>
            </div>
        </aside>
    );
};

// ── Sub-componentes locales (privados) ──────────────────────────────────────
// Estos no se exportan porque solo tienen sentido dentro del panel.

interface FilterDateInputProps {
    id: string;
    label: string;
    value: string;
    error?: string;
    onChange: (value: string) => void;
}

const FilterDateInput = ({ id, label, value, error, onChange }: FilterDateInputProps) => (
    <div>
        <label htmlFor={id} className="mb-1 block text-xs text-slate-500">
            {label}
        </label>
        <input
            id={id}
            type="datetime-local"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
                "w-full rounded-lg border bg-white px-2.5 py-1.5 text-xs outline-none transition-colors",
                error
                    ? "border-amber-400 focus:border-amber-500"
                    : "border-slate-200 focus:border-blue-400",
            )}
        />
        {error && (
            <p id={`${id}-error`} className="mt-1 text-xs text-amber-700">
                {error}
            </p>
        )}
    </div>
);

interface FilterSelectOption {
    value: string;
    label: string;
}

interface FilterSelectProps {
    id: string;
    label: string;
    value: string;
    options: FilterSelectOption[];
    onChange: (value: string) => void;
}

const FilterSelect = ({ id, label, value, options, onChange }: FilterSelectProps) => (
    <div>
        <label
            htmlFor={id}
            className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide"
        >
            {label}
        </label>
        <div className="relative">
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 outline-none focus:border-blue-400"
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
            />
        </div>
    </div>
);