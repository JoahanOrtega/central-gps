import { useId, useState, type ChangeEvent } from "react";
import { HelpCircle } from "lucide-react";

import { unitService } from "../services/unitService";
import { resolveUnitImageSrc } from "../lib/unit-image";

const INPUT_BASE =
    "h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors";

const INPUT_EDITABLE =
    "border-slate-300 bg-white text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

const INPUT_READONLY =
    "border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed";

const INPUT_ERROR = "border-red-400 focus:border-red-500 focus:ring-red-500";

const getInputClass = (readOnly: boolean, hasError: boolean): string => {
    const state = readOnly
        ? INPUT_READONLY
        : hasError
            ? `${INPUT_EDITABLE} ${INPUT_ERROR}`
            : INPUT_EDITABLE;
    return `${INPUT_BASE} ${state}`;
};

interface LabelProps {
    label: string;
    required?: boolean;
    hint?: string;
    htmlFor?: string;
}

const FieldLabel = ({ label, required, hint, htmlFor }: LabelProps) => (
    <div className="mb-1.5 flex items-center gap-1.5">
        <label
            htmlFor={htmlFor}
            className="block text-sm font-medium text-slate-700"
        >
            {label}
            {required && (
                <span className="ml-0.5 text-red-500" aria-label="campo obligatorio">
                    *
                </span>
            )}
        </label>
        {hint && (
            <span
                className="group relative inline-flex cursor-help"
                tabIndex={0}
                aria-label={hint}
            >
                <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                <span className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-64 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white group-hover:block group-focus:block">
                    {hint}
                </span>
            </span>
        )}
    </div>
);

const FieldError = ({ error }: { error?: string }) => {
    if (!error) return null;
    return (
        <p className="mt-1 text-xs text-red-600" role="alert">
            {error}
        </p>
    );
};

interface TextFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    readOnly?: boolean;
    placeholder?: string;
    hint?: string;
    error?: string;
    maxLength?: number;
    // "tel" para teléfonos. No usamos "number" porque sus controles nativos
    // estorban más de lo que ayudan.
    type?: "text" | "tel";
}

export const TextField = ({
    label,
    value,
    onChange,
    required,
    readOnly = false,
    placeholder,
    hint,
    error,
    maxLength,
    type = "text",
}: TextFieldProps) => {
    const id = useId();
    return (
        <div>
            <FieldLabel label={label} required={required} hint={hint} htmlFor={id} />
            <input
                id={id}
                type={type}
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                readOnly={readOnly}
                placeholder={placeholder}
                maxLength={maxLength}
                aria-invalid={!!error}
                className={getInputClass(readOnly, !!error)}
            />
            <FieldError error={error} />
        </div>
    );
};

interface NumberFieldProps {
    label: string;
    value: number | null | undefined;
    onChange: (value: number | null) => void;
    required?: boolean;
    readOnly?: boolean;
    placeholder?: string;
    hint?: string;
    error?: string;
    min?: number;
    step?: number | "any";
    suffix?: string;
}

export const NumberField = ({
    label,
    value,
    onChange,
    required,
    readOnly = false,
    placeholder,
    hint,
    error,
    min,
    step = "any",
    suffix,
}: NumberFieldProps) => {
    const id = useId();
    const displayValue = value === null || value === undefined ? "" : String(value);

    // Si el usuario borra todo, emitir null en vez de 0: para campos como
    // "rendimiento", 0 sería un dato válido pero erróneo.
    const handleChange = (raw: string) => {
        if (raw === "") {
            onChange(null);
            return;
        }
        const parsed = Number(raw);
        if (Number.isNaN(parsed)) return;
        onChange(parsed);
    };

    return (
        <div>
            <FieldLabel label={label} required={required} hint={hint} htmlFor={id} />
            <div className="relative">
                <input
                    id={id}
                    type="number"
                    value={displayValue}
                    onChange={(e) => handleChange(e.target.value)}
                    readOnly={readOnly}
                    placeholder={placeholder}
                    min={min}
                    step={step}
                    aria-invalid={!!error}
                    className={`${getInputClass(readOnly, !!error)} ${suffix ? "pr-10" : ""}`}
                />
                {suffix && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                        {suffix}
                    </span>
                )}
            </div>
            <FieldError error={error} />
        </div>
    );
};

interface DateFieldProps {
    label: string;
    value: string | null | undefined;
    onChange: (value: string | null) => void;
    required?: boolean;
    readOnly?: boolean;
    hint?: string;
    error?: string;
    max?: string;
}

export const DateField = ({
    label,
    value,
    onChange,
    required,
    readOnly = false,
    hint,
    error,
    max,
}: DateFieldProps) => {
    const id = useId();
    // input type="date" solo acepta YYYY-MM-DD; si llega con hora, recortar.
    const displayValue = value ? value.slice(0, 10) : "";

    return (
        <div>
            <FieldLabel label={label} required={required} hint={hint} htmlFor={id} />
            <input
                id={id}
                type="date"
                value={displayValue}
                onChange={(e) => onChange(e.target.value || null)}
                readOnly={readOnly}
                max={max}
                aria-invalid={!!error}
                className={getInputClass(readOnly, !!error)}
            />
            <FieldError error={error} />
        </div>
    );
};

interface SelectOption {
    value: string | number;
    label: string;
}

interface SelectFieldProps {
    label: string;
    value: string | number | null | undefined;
    onChange: (value: string) => void;
    options: SelectOption[];
    required?: boolean;
    readOnly?: boolean;
    hint?: string;
    error?: string;
    placeholder?: string;
    loading?: boolean;
}

export const SelectField = ({
    label,
    value,
    onChange,
    options,
    required,
    readOnly = false,
    hint,
    error,
    placeholder = "Selecciona una opción",
    loading = false,
}: SelectFieldProps) => {
    const id = useId();
    const stringValue = value === null || value === undefined ? "" : String(value);

    return (
        <div>
            <FieldLabel label={label} required={required} hint={hint} htmlFor={id} />
            <select
                id={id}
                value={stringValue}
                onChange={(e) => onChange(e.target.value)}
                disabled={readOnly || loading}
                aria-invalid={!!error}
                className={`${getInputClass(readOnly, !!error)} ${readOnly ? "" : "cursor-pointer"}`}
            >
                <option value="">{loading ? "Cargando..." : placeholder}</option>
                {!loading &&
                    options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
            </select>
            <FieldError error={error} />
        </div>
    );
};

// Para id_grupo_unidades: chips toggleables. Más visual que un combobox
// multiselect cuando hay pocos grupos.
interface MultiSelectChipsProps {
    label: string;
    values: number[];
    onChange: (values: number[]) => void;
    options: SelectOption[];
    readOnly?: boolean;
    hint?: string;
    error?: string;
    loading?: boolean;
}

export const MultiSelectChips = ({
    label,
    values,
    onChange,
    options,
    readOnly = false,
    hint,
    error,
    loading = false,
}: MultiSelectChipsProps) => {
    const toggle = (value: number) => {
        if (readOnly) return;
        if (values.includes(value)) {
            onChange(values.filter((v) => v !== value));
        } else {
            onChange([...values, value]);
        }
    };

    return (
        <div>
            <FieldLabel label={label} hint={hint} />
            <div
                className={`flex flex-wrap gap-2 rounded-lg border p-3 min-h-[3rem] ${readOnly ? "border-slate-200 bg-slate-50" : "border-slate-300 bg-white"
                    }`}
            >
                {loading && (
                    <span className="text-sm text-slate-400">Cargando grupos...</span>
                )}
                {!loading && options.length === 0 && (
                    <span className="text-sm text-slate-400">No hay grupos disponibles</span>
                )}
                {!loading &&
                    options.map((opt) => {
                        const isActive = values.includes(Number(opt.value));
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => toggle(Number(opt.value))}
                                disabled={readOnly}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${isActive
                                    ? "bg-emerald-500 text-white"
                                    : "bg-slate-100 text-slate-700 enabled:hover:bg-slate-200"
                                    } ${readOnly ? "cursor-not-allowed opacity-75" : ""}`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
            </div>
            <FieldError error={error} />
        </div>
    );
};

// Para input1/2 y output1/2 (valores 0/1). Un toggle es más claro que un
// select de dos opciones.
interface ToggleFieldProps {
    label: string;
    value: number | undefined;
    onChange: (value: number) => void;
    readOnly?: boolean;
    hint?: string;
}

export const ToggleField = ({
    label,
    value,
    onChange,
    readOnly = false,
    hint,
}: ToggleFieldProps) => {
    const isOn = value === 1;

    return (
        <div>
            <FieldLabel label={label} hint={hint} />
            <button
                type="button"
                role="switch"
                aria-checked={isOn}
                onClick={() => !readOnly && onChange(isOn ? 0 : 1)}
                disabled={readOnly}
                className={`flex h-11 w-full items-center justify-between rounded-lg border px-3 text-sm transition-colors ${readOnly
                    ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                    }`}
            >
                <span>{isOn ? "Conectado" : "Sin uso"}</span>
                <span
                    className={`relative h-5 w-9 rounded-full transition-colors ${isOn ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                    aria-hidden
                >
                    <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${isOn ? "translate-x-[18px]" : "translate-x-0.5"
                            }`}
                    />
                </span>
            </button>
        </div>
    );
};

export const SectionHeader = ({
    title,
    description,
}: {
    title: string;
    description?: string;
}) => (
    <div className="border-b border-slate-200 pb-2">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {description && (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
    </div>
);

// Imagen de la unidad. El archivo se sube al backend (que lo guarda y devuelve
// una ruta); en el campo imagen se guarda esa ruta, no la imagen. Muestra
// "Subiendo..." mientras tanto y el error si la subida falla.
interface ImageFieldProps {
    label: string;
    // Ruta de la imagen (lo que se guarda en el campo). null si no hay.
    value: string | null;
    onChange: (ruta: string) => void;
    readOnly?: boolean;
    hint?: string;
}

export const ImageField = ({
    label,
    value,
    onChange,
    readOnly = false,
    hint,
}: ImageFieldProps) => {
    const id = useId();
    const [subiendo, setSubiendo] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setSubiendo(true);
        try {
            const { ruta } = await unitService.uploadImage(file);
            onChange(ruta);
        } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
        } finally {
            setSubiendo(false);
        }
    };

    return (
        <div className="flex flex-col items-center">
            <FieldLabel label={label} hint={hint} htmlFor={id} />
            <div className="flex h-44 w-full max-w-[220px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-300">
                {value
                    ? <img src={resolveUnitImageSrc(value)!} alt="Imagen de la unidad" className="h-full w-full object-cover" />
                    : <span>Sin imagen</span>}
            </div>
            {!readOnly && (
                <>
                    <input id={id} type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={subiendo} />
                    <button
                        type="button"
                        onClick={() => document.getElementById(id)?.click()}
                        disabled={subiendo}
                        className="mt-3 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
                    >
                        {subiendo ? "Subiendo..." : value ? "Cambiar imagen" : "Agregar imagen"}
                    </button>
                </>
            )}
            {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
        </div>
    );
};