// ─────────────────────────────────────────────────────────────────────────────
// Tab "Datos Adicionales" del editor de unidades
// ─────────────────────────────────────────────────────────────────────────────
//
// Contiene 3 secciones más ligeras:
//   1. Combustible          → tipo, capacidad tanque, rendimiento
//   2. Seguro               → aseguradora, teléfono, póliza, vigencia
//   3. Verificación vehicular → vigencia
//
// Todos los roles que ven el modal pueden editar estos campos (o verlos
// en readonly si no tienen cund_edit). No hay filtro por rol aquí —
// toda la data adicional es operativa del cliente.

import {
    TextField,
    NumberField,
    DateField,
    SelectField,
    SectionHeader,
} from "./edit-unit-fields.components";

import type { UpdateUnitPayload } from "../types/unit-edit.types";
import type { FieldErrors } from "../lib/edit-unit-validation";

// ── Catálogo de tipos de combustible ─────────────────────────────────────────
// Alineado con el legacy PHP. Los valores son string porque así se
// guardan en la columna (varchar) — no int.
const TIPOS_COMBUSTIBLE: { value: string; label: string }[] = [
    { value: "1", label: "Gasolina" },
    { value: "2", label: "Diésel" },
    { value: "3", label: "Gas LP" },
    { value: "4", label: "Eléctrico" },
    { value: "5", label: "Híbrido" },
];

interface EditUnitAdditionalTabProps {
    form: UpdateUnitPayload;
    patchForm: (changes: Partial<UpdateUnitPayload>) => void;
    canEdit: boolean;
    errors: FieldErrors;
}

export const EditUnitAdditionalTab = ({
    form,
    patchForm,
    canEdit,
    errors,
}: EditUnitAdditionalTabProps) => {
    const readOnly = !canEdit;

    return (
        <div className="space-y-6">
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* Sección 1: Combustible                                           */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
                <SectionHeader
                    title="Combustible"
                    description="Tipo, capacidad y rendimiento del vehículo"
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <SelectField
                        label="Tipo de combustible"
                        value={form.tipo_combustible}
                        onChange={(v) => patchForm({ tipo_combustible: v || null })}
                        options={TIPOS_COMBUSTIBLE}
                        readOnly={readOnly}
                        error={errors.tipo_combustible}
                    />
                    <NumberField
                        label="Capacidad del tanque"
                        value={form.capacidad_tanque}
                        onChange={(v) => patchForm({ capacidad_tanque: v })}
                        readOnly={readOnly}
                        min={0}
                        suffix="l"
                        placeholder="Ej. 60"
                        error={errors.capacidad_tanque}
                    />
                    <NumberField
                        label="Rendimiento establecido"
                        value={form.rendimiento_establecido}
                        onChange={(v) => patchForm({ rendimiento_establecido: v })}
                        readOnly={readOnly}
                        min={0}
                        suffix="km/l"
                        placeholder="Ej. 12.5"
                        hint="Kilómetros por litro esperados para esta unidad. Se usa para calcular desviaciones de consumo."
                        error={errors.rendimiento_establecido}
                    />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* Sección 2: Seguro                                                */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
                <SectionHeader
                    title="Seguro"
                    description="Datos de la póliza y contacto de la aseguradora"
                />

                <TextField
                    label="Nombre de la aseguradora"
                    value={form.nombre_aseguradora ?? ""}
                    onChange={(v) => patchForm({ nombre_aseguradora: v || null })}
                    readOnly={readOnly}
                    placeholder="Ej. GNP Seguros"
                    error={errors.nombre_aseguradora}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <TextField
                        label="Teléfono"
                        value={form.telefono_aseguradora ?? ""}
                        onChange={(v) => patchForm({ telefono_aseguradora: v || null })}
                        readOnly={readOnly}
                        type="tel"
                        placeholder="55 1234 5678"
                        error={errors.telefono_aseguradora}
                    />
                    <TextField
                        label="Número de póliza"
                        value={form.no_poliza_seguro ?? ""}
                        onChange={(v) => patchForm({ no_poliza_seguro: v || null })}
                        readOnly={readOnly}
                        placeholder="POL-123456"
                        error={errors.no_poliza_seguro}
                    />
                    <DateField
                        label="Vigencia de la póliza"
                        value={form.vigencia_poliza_seguro}
                        onChange={(v) => patchForm({ vigencia_poliza_seguro: v })}
                        readOnly={readOnly}
                        hint="Fecha hasta la cual está vigente la cobertura"
                        error={errors.vigencia_poliza_seguro}
                    />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* Sección 3: Verificación vehicular                                */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
                <SectionHeader
                    title="Verificación vehicular"
                    description="Vigencia de la última verificación aprobada"
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <DateField
                        label="Vigencia de la verificación"
                        value={form.vigencia_verificacion_vehicular}
                        onChange={(v) => patchForm({ vigencia_verificacion_vehicular: v })}
                        readOnly={readOnly}
                        hint="El sistema puede generar alertas cuando esta fecha esté próxima a vencer"
                        error={errors.vigencia_verificacion_vehicular}
                    />
                </div>
            </div>
        </div>
    );
};