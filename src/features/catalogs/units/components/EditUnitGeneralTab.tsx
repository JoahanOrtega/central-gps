// ─────────────────────────────────────────────────────────────────────────────
// Tab "Datos Generales" del editor de unidades
// ─────────────────────────────────────────────────────────────────────────────
//
// Contiene 3 secciones:
//   1. Identidad  → número, marca, modelo, año, no.serie, matrícula, tipo,
//                   odómetro
//   2. Asignación → operador + fecha asignación, grupos
//   3. Equipo instalado → SOLO para sudo_erp (canViewTechnical)
//                         Modelo AVL, fecha instalación, IMEI, chip,
//                         inputs 1-2, outputs 1-2
//
// Todos los campos leen `canEdit` desde props para propagar readonly
// sin duplicar lógica. Los errores inline vienen de `errors[campo]`
// si existen.

import { useMemo } from "react";

import {
    TextField,
    NumberField,
    DateField,
    SelectField,
    MultiSelectChips,
    ToggleField,
    SectionHeader,
} from "./edit-unit-fields.components";

import { useOperators, useUnitGroups, useAvlModels } from "@/hooks/useCatalogQueries";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";

import type { UpdateUnitPayload } from "../types/unit-edit.types";
import type { FieldErrors } from "../lib/edit-unit-validation";

// ── Catálogo de tipos de unidad (espejo del backend: ids 1-7) ────────────────
// Está hardcodeado porque no hay endpoint aún — si se crea, migramos al
// hook correspondiente. Las etiquetas son las del legacy PHP.
const TIPOS_UNIDAD: { value: number; label: string }[] = [
    { value: 1, label: "Automóvil" },
    { value: 2, label: "Camioneta" },
    { value: 3, label: "Camión" },
    { value: 4, label: "Motocicleta" },
    { value: 5, label: "Autobús" },
    { value: 6, label: "Maquinaria" },
    { value: 7, label: "Otro" },
];

interface EditUnitGeneralTabProps {
    form: UpdateUnitPayload;
    patchForm: (changes: Partial<UpdateUnitPayload>) => void;
    canEdit: boolean;
    canViewTechnical: boolean;
    errors: FieldErrors;
}

export const EditUnitGeneralTab = ({
    form,
    patchForm,
    canEdit,
    canViewTechnical,
    errors,
}: EditUnitGeneralTabProps) => {
    const { idEmpresa } = useEmpresaActiva();

    // Catálogos: TanStack Query cachea 5 min, así que abrir/cerrar el modal
    // no re-fetchea. En la primera apertura hay 3 requests paralelos.
    const { data: operators = [], isLoading: loadingOps } = useOperators(idEmpresa);
    const { data: groups = [], isLoading: loadingGroups } = useUnitGroups(idEmpresa);
    const { data: avlModels = [], isLoading: loadingAvl } = useAvlModels();

    // Transformar catálogos al formato { value, label } que esperan
    // los campos. useMemo para no recalcular en cada render.
    const operatorOptions = useMemo(
        () => operators.map((o) => ({ value: o.id_operador, label: o.nombre })),
        [operators],
    );
    const groupOptions = useMemo(
        () => groups.map((g) => ({ value: g.id_grupo_unidades, label: g.nombre })),
        [groups],
    );
    const avlOptions = useMemo(
        () => avlModels.map((m) => ({ value: m.id_modelo_avl, label: m.modelo })),
        [avlModels],
    );

    // Fecha máxima: hoy (formato YYYY-MM-DD). Para el input de fecha
    // instalación — el backend valida que no sea futura, prevenimos el
    // error del lado del cliente para ahorrar el roundtrip.
    const today = new Date().toISOString().slice(0, 10);

    const readOnly = !canEdit;

    return (
        <div className="space-y-6">
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* Sección 1: Identidad                                             */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
                <SectionHeader
                    title="Identidad"
                    description="Datos básicos que identifican la unidad"
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <TextField
                        label="Número"
                        value={form.numero ?? ""}
                        onChange={(v) => patchForm({ numero: v })}
                        required
                        readOnly={readOnly}
                        maxLength={20}
                        error={errors.numero}
                        placeholder="Ej. 01"
                    />
                    <TextField
                        label="Marca"
                        value={form.marca ?? ""}
                        onChange={(v) => patchForm({ marca: v })}
                        required
                        readOnly={readOnly}
                        maxLength={50}
                        error={errors.marca}
                        placeholder="Ej. Volkswagen"
                    />
                    <TextField
                        label="Modelo"
                        value={form.modelo ?? ""}
                        onChange={(v) => patchForm({ modelo: v || null })}
                        readOnly={readOnly}
                        maxLength={50}
                        error={errors.modelo}
                        placeholder="Ej. Jetta"
                    />
                    <TextField
                        label="Año"
                        value={form.anio ?? ""}
                        onChange={(v) => patchForm({ anio: v || null })}
                        readOnly={readOnly}
                        maxLength={4}
                        error={errors.anio}
                        placeholder="Ej. 2024"
                    />
                    <TextField
                        label="No. Serie"
                        value={form.no_serie ?? ""}
                        onChange={(v) => patchForm({ no_serie: v || null })}
                        readOnly={readOnly}
                        error={errors.no_serie}
                    />
                    <TextField
                        label="Matrícula"
                        value={form.matricula ?? ""}
                        onChange={(v) => patchForm({ matricula: v || null })}
                        readOnly={readOnly}
                        maxLength={20}
                        error={errors.matricula}
                        placeholder="Ej. ABC-123-D"
                    />
                    <SelectField
                        label="Tipo"
                        value={form.tipo}
                        onChange={(v) => patchForm({ tipo: v ? Number(v) : undefined })}
                        options={TIPOS_UNIDAD}
                        required
                        readOnly={readOnly}
                        error={errors.tipo}
                    />
                    <NumberField
                        label="Odómetro"
                        value={form.odometro_inicial}
                        onChange={(v) => patchForm({ odometro_inicial: v ?? undefined })}
                        readOnly={readOnly}
                        min={0}
                        suffix="km"
                        error={errors.odometro_inicial}
                    />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* Sección 2: Asignación                                            */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
                <SectionHeader
                    title="Asignación"
                    description="Operador responsable y grupos a los que pertenece"
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <SelectField
                        label="Operador"
                        value={form.id_operador}
                        onChange={(v) =>
                            patchForm({ id_operador: v ? Number(v) : null })
                        }
                        options={operatorOptions}
                        readOnly={readOnly}
                        loading={loadingOps}
                        placeholder="Sin asignar"
                        error={errors.id_operador}
                    />
                    <DateField
                        label="Fecha de asignación"
                        value={form.fecha_asignacion_operador}
                        onChange={(v) => patchForm({ fecha_asignacion_operador: v })}
                        readOnly={readOnly || !form.id_operador}
                        hint={
                            !form.id_operador
                                ? "Selecciona un operador primero para habilitar este campo"
                                : undefined
                        }
                        error={errors.fecha_asignacion_operador}
                    />
                </div>

                <MultiSelectChips
                    label="Grupos de unidades"
                    values={form.id_grupo_unidades ?? []}
                    onChange={(values) => patchForm({ id_grupo_unidades: values })}
                    options={groupOptions}
                    readOnly={readOnly}
                    loading={loadingGroups}
                    error={errors.id_grupo_unidades}
                />
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* Sección 3: Equipo instalado (SOLO sudo_erp)                      */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {canViewTechnical && (
                <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/30 p-4">
                    <SectionHeader
                        title="Equipo instalado"
                        description="Configuración del dispositivo AVL y periféricos. Visible solo para administradores del sistema."
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <SelectField
                            label="Modelo AVL"
                            value={form.id_modelo_avl}
                            onChange={(v) =>
                                patchForm({ id_modelo_avl: v ? Number(v) : null })
                            }
                            options={avlOptions}
                            readOnly={readOnly}
                            loading={loadingAvl}
                            hint="Modelo del dispositivo de rastreo instalado en la unidad"
                            error={errors.id_modelo_avl}
                        />
                        <DateField
                            label="Fecha de instalación"
                            value={form.fecha_instalacion}
                            onChange={(v) => patchForm({ fecha_instalacion: v ?? undefined })}
                            readOnly={readOnly}
                            max={today}
                            required
                            error={errors.fecha_instalacion}
                        />
                        <TextField
                            label="IMEI"
                            value={form.imei ?? ""}
                            onChange={(v) => patchForm({ imei: v })}
                            readOnly={readOnly}
                            required
                            maxLength={15}
                            hint="Identificador único del equipo AVL: exactamente 10 dígitos numéricos (estándar GSM)"
                            placeholder="1234567890"
                            error={errors.imei}
                        />
                        <TextField
                            label="Chip"
                            value={form.chip ?? ""}
                            onChange={(v) => patchForm({ chip: v })}
                            readOnly={readOnly}
                            required
                            maxLength={20}
                            hint="Número de la tarjeta SIM instalada en el AVL"
                            error={errors.chip}
                        />
                    </div>

                    <div>
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Periféricos instalados
                        </h4>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            <ToggleField
                                label="Input 1"
                                value={form.input1}
                                onChange={(v) => patchForm({ input1: v })}
                                readOnly={readOnly}
                            />
                            <ToggleField
                                label="Input 2"
                                value={form.input2}
                                onChange={(v) => patchForm({ input2: v })}
                                readOnly={readOnly}
                            />
                            <ToggleField
                                label="Output 1"
                                value={form.output1}
                                onChange={(v) => patchForm({ output1: v })}
                                readOnly={readOnly}
                            />
                            <ToggleField
                                label="Output 2"
                                value={form.output2}
                                onChange={(v) => patchForm({ output2: v })}
                                readOnly={readOnly}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};