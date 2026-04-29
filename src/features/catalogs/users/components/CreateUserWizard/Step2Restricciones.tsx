import { useQuery } from "@tanstack/react-query";
import {
    getUnitGroupsByEmpresa,
    getClientsByEmpresa,
} from "../../services/userService";
import { queryKeys } from "@/lib/query-keys";
import type {
    WizardFormState,
    UserFieldErrors,
    GrupoUnidadOption,
    ClienteOption,
} from "../../types/user.types";

// ─── Días de la semana ────────────────────────────────────────────────────────
// Códigos coinciden con los que valida el backend:
//   L=Lunes, M=Martes, X=Miércoles, J=Jueves, V=Viernes, S=Sábado, D=Domingo
//
// Orden: empezamos en lunes (estándar ISO 8601 / convención mexicana) en
// lugar de domingo (estándar US). Para usuarios de México lo natural es
// que la semana laboral empieza el lunes.
const DIAS = [
    { code: "L", label: "Lun" },
    { code: "M", label: "Mar" },
    { code: "X", label: "Mié" },
    { code: "J", label: "Jue" },
    { code: "V", label: "Vie" },
    { code: "S", label: "Sáb" },
    { code: "D", label: "Dom" },
] as const;

interface Step2RestriccionesProps {
    form: WizardFormState;
    onChange: (patch: Partial<WizardFormState>) => void;
    serverErrors: UserFieldErrors["restricciones"];
    // ID de la empresa para la que se crea/edita el usuario.
    // Se usa para cargar grupos de unidades y clientes específicos.
    idEmpresa: number;
}

export const Step2Restricciones = ({
    form,
    onChange,
    serverErrors,
    idEmpresa,
}: Step2RestriccionesProps) => {
    // ─── Carga de recursos auxiliares ───────────────────────────────────────
    // TanStack Query maneja caché por id_empresa. Si el sudo_erp crea
    // varios usuarios para la misma empresa, no re-fetcha.
    // enabled !!idEmpresa evita request si por algún bug el id viniera 0.
    const { data: gruposUnidades = [], isLoading: loadingGrupos } = useQuery<
        GrupoUnidadOption[]
    >({
        queryKey: queryKeys.erp.unitGroupsByEmpresa(idEmpresa),
        queryFn: ({ signal }) => getUnitGroupsByEmpresa(idEmpresa, signal),
        enabled: !!idEmpresa,
    });

    const { data: clientes = [], isLoading: loadingClientes } = useQuery<
        ClienteOption[]
    >({
        queryKey: queryKeys.erp.clientsByEmpresa(idEmpresa),
        queryFn: ({ signal }) => getClientsByEmpresa(idEmpresa, signal),
        enabled: !!idEmpresa,
    });

    // ─── Toggle de día ──────────────────────────────────────────────────────
    // El array dias_acceso vive en form como Array<string>. Aquí
    // agregamos/quitamos códigos según el checkbox. Reordenamos en orden
    // canónico (L,M,X,J,V,S,D) tras cada toggle, para que al enviar al
    // backend la string sea siempre "L,M,X" y no "X,M,L".
    const toggleDia = (code: string) => {
        const yaSeleccionado = form.dias_acceso.includes(code);
        const nuevos = yaSeleccionado
            ? form.dias_acceso.filter((d) => d !== code)
            : [...form.dias_acceso, code];

        const ordenCanonico: string[] = DIAS.map((d) => d.code);
        nuevos.sort((a, b) => ordenCanonico.indexOf(a) - ordenCanonico.indexOf(b));

        onChange({ dias_acceso: nuevos });
    };

    // ─── Validación local de horas ──────────────────────────────────────────
    // Si vienen ambas, inicio < fin es obligatorio. El backend revalida.
    const horaError = (() => {
        if (!form.hora_inicio || !form.hora_fin) return null;
        if (form.hora_inicio >= form.hora_fin)
            return "La hora de inicio debe ser anterior a la hora de fin";
        return null;
    })();

    // Mostrar error del backend si llegó
    const horaServerError =
        serverErrors?.hora_fin_acceso?.[0] ??
        serverErrors?.hora_inicio_acceso?.[0] ??
        null;

    return (
        <div className="flex flex-col gap-5">
            {/* ── Banner explicativo ────────────────────────────────────
                Step opcional. Aclararlo evita la fricción de que el usuario
                sienta que debe llenar todo. Heurística #6: reconocer en
                lugar de recordar. */}
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Todas las restricciones son <strong>opcionales</strong>. Si las dejas
                vacías, el usuario tendrá acceso sin límites de tiempo, grupo o cliente.
            </div>

            {/* ── Días y horario de acceso ─────────────────────────── */}
            <fieldset className="flex flex-col gap-3">
                <legend className="text-sm font-medium text-slate-700">
                    Días y horario de acceso
                </legend>

                {/* Días como toggle de botones redondeados.
                    Más fácil de tocar en mobile que checkbox + label. */}
                <div>
                    <p className="mb-2 text-xs text-slate-500">Días permitidos</p>
                    <div
                        className="flex flex-wrap gap-2"
                        role="group"
                        aria-label="Días de la semana"
                    >
                        {DIAS.map((dia) => {
                            const isSelected = form.dias_acceso.includes(dia.code);
                            return (
                                <button
                                    key={dia.code}
                                    type="button"
                                    onClick={() => toggleDia(dia.code)}
                                    // aria-pressed comunica el estado on/off de un toggle
                                    // a los lectores de pantalla.
                                    aria-pressed={isSelected}
                                    className={`flex h-10 min-w-[48px] items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors ${isSelected
                                        ? "border-blue-400 bg-blue-50 text-blue-700"
                                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                >
                                    {dia.label}
                                </button>
                            );
                        })}
                    </div>
                    {/* Botones rápidos para casos comunes — atajos típicos
                        que ahorran clicks repetitivos. */}
                    <div className="mt-2 flex gap-3 text-xs">
                        <button
                            type="button"
                            onClick={() => onChange({ dias_acceso: DIAS.map((d) => d.code) })}
                            className="text-blue-600 hover:underline"
                        >
                            Seleccionar todos
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange({ dias_acceso: [] })}
                            className="text-slate-500 hover:underline"
                        >
                            Limpiar
                        </button>
                    </div>
                </div>

                {/* Horas de inicio y fin en grid de 2 columnas */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="wiz-hora-inicio" className="text-xs text-slate-500">
                            Hora de inicio
                        </label>
                        <input
                            id="wiz-hora-inicio"
                            type="time"
                            value={form.hora_inicio}
                            onChange={(e) => onChange({ hora_inicio: e.target.value })}
                            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-400"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="wiz-hora-fin" className="text-xs text-slate-500">
                            Hora de fin
                        </label>
                        <input
                            id="wiz-hora-fin"
                            type="time"
                            value={form.hora_fin}
                            onChange={(e) => onChange({ hora_fin: e.target.value })}
                            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-400"
                        />
                    </div>
                </div>
                {(horaError || horaServerError) && (
                    <p role="alert" className="text-xs text-rose-600">
                        {horaServerError ?? horaError}
                    </p>
                )}
                <p className="text-xs text-slate-400">
                    Si dejas ambas vacías, el usuario podrá iniciar sesión a cualquier hora.
                </p>
            </fieldset>

            <div className="border-t border-slate-200" aria-hidden="true" />

            {/* ── Grupo de unidades ──────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor="wiz-grupo-unidades"
                    className="text-sm font-medium text-slate-700"
                >
                    Grupo de unidades visibles
                    <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
                </label>
                <select
                    id="wiz-grupo-unidades"
                    value={form.id_grupo_unidades ?? ""}
                    onChange={(e) =>
                        onChange({
                            id_grupo_unidades: e.target.value ? Number(e.target.value) : null,
                        })
                    }
                    disabled={loadingGrupos}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-400 disabled:opacity-50"
                >
                    <option value="">Todas las unidades de la empresa</option>
                    {gruposUnidades.map((g) => (
                        <option key={g.id_grupo_unidades} value={g.id_grupo_unidades}>
                            {g.nombre}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-slate-400">
                    Si seleccionas un grupo, el usuario solo verá las unidades de ese grupo.
                </p>
            </div>

            {/* ── Cliente espejo ─────────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="wiz-cliente" className="text-sm font-medium text-slate-700">
                    Cuenta espejo de cliente
                    <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
                </label>
                <select
                    id="wiz-cliente"
                    value={form.id_cliente ?? ""}
                    onChange={(e) =>
                        onChange({
                            id_cliente: e.target.value ? Number(e.target.value) : null,
                        })
                    }
                    disabled={loadingClientes}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-400 disabled:opacity-50"
                >
                    <option value="">Sin cliente específico</option>
                    {clientes.map((c) => (
                        <option key={c.id_cliente} value={c.id_cliente}>
                            {c.nombre}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-slate-400">
                    El usuario solo podrá ver información relacionada con este cliente.
                </p>
            </div>

            {/* ── Días de consulta histórica ─────────────────────────── */}
            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor="wiz-dias-consulta"
                    className="text-sm font-medium text-slate-700"
                >
                    Días de consulta histórica
                    <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
                </label>
                <input
                    id="wiz-dias-consulta"
                    type="number"
                    min="0"
                    max="3650"
                    value={form.dias_consulta}
                    onChange={(e) => onChange({ dias_consulta: e.target.value })}
                    placeholder="0 = sin límite"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-400"
                />
                {serverErrors?.dias_consulta?.[0] && (
                    <p role="alert" className="text-xs text-rose-600">
                        {serverErrors.dias_consulta[0]}
                    </p>
                )}
                <p className="text-xs text-slate-400">
                    Cuántos días hacia atrás puede consultar movimientos. 0 o vacío = sin límite.
                </p>
            </div>
        </div>
    );
};