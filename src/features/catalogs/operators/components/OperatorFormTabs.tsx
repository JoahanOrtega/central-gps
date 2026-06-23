import { Field, inputClass } from "@/components/shared/form-helpers";
import type { OperatorFieldErrors } from "../services/operator.types";

// Opción genérica para los selects de grupos y unidades.
export interface SelectOption {
    label: string;
    value: number;
}

// Estructura del formulario, compartida entre crear y editar.
export interface OperatorForm {
    nombre: string;
    clave: string;
    telefono: string;
    direccion: string;
    fecha_nacimiento: string;
    licencia: string;
    tipo_licencia: string;
    vencimiento_licencia: string;
    // Asignaciones (selects). 0 / [] = sin asignar.
    id_grupo_operadores: number[];
    id_unidad: number;
    // Domicilio (geocerca) — campos aplanados que consume el GeoFenceTab.
    // Si lat/lng son null, el operador no tiene domicilio configurado.
    tipo_poi: number;
    direccionEsAproximada: boolean;
    lat: number | null;
    lng: number | null;
    radio: number;
    bounds: string;
    area: string;
    polygon_path: string;
    polygon_color: string;
    radio_color: string;
    // TODO(rfid): el v3.0 incluye un campo RFID en el operador. Se omitió por
    //   decisión de negocio (el RFID se gestiona en aforos, no en operadores).
    //   Reanalizar antes de reincorporarlo: ¿de verdad el operador necesita
    //   portar un tag, o el aforo resuelve la identidad por otro medio?
    // TODO(foto): el v3.0 permite subir foto del operador. Requiere subsistema
    //   de upload de archivos que el proyecto aún no tiene.
}

export const EMPTY_OPERATOR_FORM: OperatorForm = {
    nombre: "",
    clave: "",
    telefono: "",
    direccion: "",
    fecha_nacimiento: "",
    licencia: "",
    tipo_licencia: "",
    vencimiento_licencia: "",
    id_grupo_operadores: [],
    id_unidad: 0,
    // Domicilio: por defecto sin geocerca (lat/lng en null).
    tipo_poi: 1,
    direccionEsAproximada: false,
    lat: null,
    lng: null,
    radio: 50,
    bounds: "",
    area: "",
    polygon_path: "",
    polygon_color: "#5e6383",
    radio_color: "#5e6383",
};

// Tipos de licencia del v3.0 (catálogo fijo A–E).
export const LICENSE_TYPES = ["A", "B", "C", "D", "E"];

interface TabProps {
    form: OperatorForm;
    errors: OperatorFieldErrors;
    onChange: (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => void;
    // Opciones para los selects (las carga el modal).
    grupoOptions?: SelectOption[];
    unidadOptions?: SelectOption[];
    // Cambio del multi-select de grupos (lo maneja el modal, no es un input nativo).
    onGruposChange?: (ids: number[]) => void;
}

// ── Pestaña: Datos generales ──────────────────────────────────────────────────

export const OperatorGeneralTab = ({
    form,
    errors,
    onChange,
    grupoOptions = [],
    unidadOptions = [],
    onGruposChange,
}: TabProps) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Clave">
            <input
                name="clave"
                value={form.clave}
                onChange={onChange}
                className={inputClass}
                placeholder="Clave interna"
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
                className={inputClass}
                placeholder="Nombre completo del operador"
                autoFocus
            />
            {errors.nombre && (
                <p className="mt-1 text-xs text-red-600">{errors.nombre[0]}</p>
            )}
        </Field>

        <Field label="Teléfono">
            <input
                name="telefono"
                value={form.telefono}
                onChange={onChange}
                className={inputClass}
                placeholder="10 dígitos"
            />
        </Field>

        <Field label="Fecha de nacimiento">
            <input
                type="date"
                name="fecha_nacimiento"
                value={form.fecha_nacimiento}
                onChange={onChange}
                className={inputClass}
            />
        </Field>

        {/* Asignar grupos de operadores — chips toggleables (mismo patrón que
        los días de operación en itinerarios). Tocar un chip lo activa/desactiva. */}
        <div className="sm:col-span-2">
            <Field label="Asignar grupos de operadores">
                {grupoOptions.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-400">
                        No hay grupos disponibles para esta empresa.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-1.5">
                        {grupoOptions.map((g) => {
                            const activo = form.id_grupo_operadores.includes(g.value);
                            return (
                                <button
                                    key={g.value}
                                    type="button"
                                    aria-pressed={activo}
                                    onClick={() =>
                                        onGruposChange?.(
                                            activo
                                                ? form.id_grupo_operadores.filter((id) => id !== g.value)
                                                : [...form.id_grupo_operadores, g.value],
                                        )
                                    }
                                    className={[
                                        "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                                        activo
                                            ? "bg-sky-500 text-white shadow-sm"
                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                                    ].join(" ")}
                                >
                                    {g.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </Field>
        </div>

        {/* Asignar unidad (select simple — relación exclusiva 1:1). */}
        <div className="sm:col-span-2">
            <Field label="Asignar unidad">
                <select
                    name="id_unidad"
                    value={form.id_unidad}
                    onChange={onChange}
                    className={inputClass}
                >
                    <option value={0}>— Sin asignar —</option>
                    {unidadOptions.map((u) => (
                        <option key={u.value} value={u.value}>
                            {u.label}
                        </option>
                    ))}
                </select>
            </Field>
        </div>
    </div>
);

// ── Pestaña: Licencia ─────────────────────────────────────────────────────────

export const OperatorLicenseTab = ({ form, onChange }: TabProps) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Número de licencia">
            <input
                name="licencia"
                value={form.licencia}
                onChange={onChange}
                className={inputClass}
                placeholder="Número de licencia de conducir"
            />
        </Field>

        <Field label="Tipo de licencia">
            <select
                name="tipo_licencia"
                value={form.tipo_licencia}
                onChange={onChange}
                className={inputClass}
            >
                <option value="">— seleccione —</option>
                {LICENSE_TYPES.map((t) => (
                    <option key={t} value={t}>
                        {t}
                    </option>
                ))}
            </select>
        </Field>

        <Field label="Vencimiento de licencia">
            <input
                type="date"
                name="vencimiento_licencia"
                value={form.vencimiento_licencia}
                onChange={onChange}
                className={inputClass}
            />
        </Field>
    </div>
);