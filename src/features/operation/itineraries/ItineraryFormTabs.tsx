import { Wand2, Lock, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
    DiaSemana,
    TipoItinerario,
    ParadaItinerario,
} from "./itinerary.types";
import { DIA_LABEL } from "./itinerary.types";

// ══════════════════════════════════════════════════════════════════════════════
// Estado compartido del formulario
// ══════════════════════════════════════════════════════════════════════════════

export interface ItineraryFormState {
    turno: string;
    tipo: TipoItinerario;
    dias: DiaSemana[];
    horaInicio: string;
    horaFin: string;
    tolInicio: number;
    tolFin: number;
    tolAnticip: number;
    fechaInicio: string;
    paradas: ParadaItinerario[];
}

// El paso 2 se habilita cuando los campos mínimos del paso 1 están completos.
// Mismo patrón que la v3.0: "Completa info general para habilitar esta sección".
export const isGeneralStepComplete = (
    state: ItineraryFormState,
    hasRouteAndLogistics: boolean,
): boolean =>
    hasRouteAndLogistics &&
    state.turno.trim().length > 0 &&
    state.dias.length > 0;

// ══════════════════════════════════════════════════════════════════════════════
// Autofill de horarios — distribuye linealmente entre hora_inicio y hora_fin
// ══════════════════════════════════════════════════════════════════════════════

const toMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};

const toHHMM = (minutos: number): string => {
    const h = Math.floor(minutos / 60) % 24;
    const m = Math.round(minutos % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/**
 * Distribuye los horarios de abordaje uniformemente entre hora_inicio
 * y hora_fin. La primera parada recibe hora_inicio, la última hora_fin,
 * y las intermedias se interpolan linealmente.
 *
 * Equivale al TURN_SCHEDULE_AUTOFILL de la v3.0 pero simplificado:
 * sin tráfico estimado, solo interpolación uniforme como punto de partida
 * que el usuario puede ajustar manualmente.
 */
export const autofillHorarios = (
    paradas: ParadaItinerario[],
    horaInicio: string,
    horaFin: string,
): ParadaItinerario[] => {
    if (!horaInicio || !horaFin || paradas.length === 0) return paradas;

    const inicio = toMinutes(horaInicio);
    let fin = toMinutes(horaFin);

    // Itinerario nocturno: si fin < inicio, cruza medianoche
    if (fin < inicio) fin += 24 * 60;

    // Una sola parada → recibe la hora de inicio
    if (paradas.length === 1) {
        return [{ ...paradas[0], hora_abordaje: toHHMM(inicio) }];
    }

    const intervalo = (fin - inicio) / (paradas.length - 1);

    return paradas.map((p, idx) => ({
        ...p,
        hora_abordaje: toHHMM(inicio + intervalo * idx),
    }));
};

// ══════════════════════════════════════════════════════════════════════════════
// PASO 1 — Información general (campos comunes a crear/editar)
// ══════════════════════════════════════════════════════════════════════════════

interface GeneralStepProps {
    state: ItineraryFormState;
    onChange: (patch: Partial<ItineraryFormState>) => void;
    fieldErrors: Record<string, string>;
    // Slot para los selects de ruta/sentido — solo el modal de crear los
    // necesita; el de editar muestra la ruta como texto fijo.
    routeSlot?: React.ReactNode;
}

export const GeneralStep = ({
    state,
    onChange,
    fieldErrors,
    routeSlot,
}: GeneralStepProps) => {
    const toggleDia = (d: DiaSemana) =>
        onChange({
            dias: state.dias.includes(d)
                ? state.dias.filter((x) => x !== d)
                : [...state.dias, d],
        });

    const todos: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0];

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            {/* Slot de ruta/sentido (crear) o info fija (editar) */}
            {routeSlot}

            {/* Turno y tipo */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor="itin-turno">Código de turno *</Label>
                    <Input
                        id="itin-turno"
                        value={state.turno}
                        onChange={(e) => onChange({ turno: e.target.value })}
                        placeholder="ej: 1, 2, 1A"
                        maxLength={10}
                    />
                    {fieldErrors.turno && (
                        <p className="text-xs text-red-500">{fieldErrors.turno}</p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="itin-tipo">Tipo</Label>
                    <select
                        id="itin-tipo"
                        value={state.tipo}
                        onChange={(e) =>
                            onChange({ tipo: Number(e.target.value) as TipoItinerario })
                        }
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                        <option value={1}>Regular (días recurrentes)</option>
                        <option value={2}>Especial (fecha concreta)</option>
                    </select>
                </div>
            </div>

            {/* Días de operación */}
            <div className="space-y-1.5">
                <Label>Días de operación *</Label>
                <div className="flex flex-wrap gap-1.5">
                    {todos.map((d) => {
                        const activo = state.dias.includes(d);
                        return (
                            <button
                                key={d}
                                type="button"
                                onClick={() => toggleDia(d)}
                                className={[
                                    "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                                    activo
                                        ? "bg-sky-500 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                                ].join(" ")}
                                aria-pressed={activo}
                            >
                                {DIA_LABEL[d]}
                            </button>
                        );
                    })}
                </div>
                {fieldErrors.dias && (
                    <p className="text-xs text-red-500">{fieldErrors.dias}</p>
                )}
            </div>

            {/* Fecha del servicio — solo para tipo especial */}
            {state.tipo === 2 && (
                <div className="space-y-1.5">
                    <Label htmlFor="itin-fecha">Fecha del servicio *</Label>
                    <Input
                        id="itin-fecha"
                        type="date"
                        value={state.fechaInicio}
                        onChange={(e) => onChange({ fechaInicio: e.target.value })}
                        className="max-w-xs"
                    />
                    {fieldErrors.fecha_inicio && (
                        <p className="text-xs text-red-500">{fieldErrors.fecha_inicio}</p>
                    )}
                </div>
            )}

            {/* Horario */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor="itin-hora-inicio">Hora de inicio</Label>
                    <Input
                        id="itin-hora-inicio"
                        type="time"
                        value={state.horaInicio}
                        onChange={(e) => onChange({ horaInicio: e.target.value })}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="itin-hora-fin">Hora de fin</Label>
                    <Input
                        id="itin-hora-fin"
                        type="time"
                        value={state.horaFin}
                        onChange={(e) => onChange({ horaFin: e.target.value })}
                    />
                    {fieldErrors.hora_fin && (
                        <p className="text-xs text-red-500">{fieldErrors.hora_fin}</p>
                    )}
                </div>
            </div>

            {/* Tolerancias */}
            <div className="space-y-1.5">
                <Label>Tolerancias (minutos)</Label>
                <p className="text-xs text-slate-400">
                    Margen permitido antes de marcar incumplimiento.
                </p>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { key: "tolInicio", label: "Inicio", value: state.tolInicio },
                        { key: "tolFin", label: "Fin", value: state.tolFin },
                        { key: "tolAnticip", label: "Anticipación", value: state.tolAnticip },
                    ].map(({ key, label, value }) => (
                        <div key={key} className="space-y-1">
                            <Label className="text-xs text-slate-500">{label}</Label>
                            <Input
                                type="number"
                                min={0}
                                max={120}
                                value={value}
                                onChange={(e) =>
                                    onChange({ [key]: Number(e.target.value) } as Partial<ItineraryFormState>)
                                }
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// PASO 2 — Paradas y horarios de abordaje
// ══════════════════════════════════════════════════════════════════════════════

interface StopsStepProps {
    state: ItineraryFormState;
    onChange: (patch: Partial<ItineraryFormState>) => void;
    enabled: boolean;
}

// Valida que el horario de la parada esté dentro de la ventana del turno.
// Mismo concepto que isStopTimeWithinTurnWindow de la v3.0 — feedback
// visual inmediato sin bloquear el guardado.
const isHoraFueraDeVentana = (
    hora: string | null,
    horaInicio: string,
    horaFin: string,
): boolean => {
    if (!hora || !horaInicio || !horaFin) return false;
    const h = toMinutes(hora);
    const inicio = toMinutes(horaInicio);
    let fin = toMinutes(horaFin);
    if (fin < inicio) fin += 24 * 60;          // nocturno
    const hNorm = h < inicio ? h + 24 * 60 : h; // hora después de medianoche
    return hNorm < inicio || hNorm > fin;
};

export const StopsStep = ({ state, onChange, enabled }: StopsStepProps) => {
    // Paso bloqueado — mismo mensaje guía que la v3.0
    if (!enabled) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
                <Lock className="h-8 w-8 text-slate-300" aria-hidden="true" />
                <p className="max-w-sm text-sm text-slate-500">
                    Completa la <strong>información general</strong> (ruta, sentido,
                    código de turno y días) para asignar los horarios de abordaje.
                </p>
            </div>
        );
    }

    if (state.paradas.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
                <MapPin className="h-8 w-8 text-slate-300" aria-hidden="true" />
                <p className="max-w-sm text-sm text-slate-500">
                    La logística seleccionada no tiene paradas registradas.
                    Agrégalas primero en el módulo de Rutas.
                </p>
            </div>
        );
    }

    const updateHora = (idx: number, hora: string) => {
        const next = [...state.paradas];
        next[idx] = { ...next[idx], hora_abordaje: hora || null };
        onChange({ paradas: next });
    };

    const canAutofill = Boolean(state.horaInicio && state.horaFin);

    return (
        <div className="mx-auto max-w-3xl space-y-4">
            {/* Barra de acciones del paso */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                    {state.paradas.length} parada{state.paradas.length !== 1 ? "s" : ""} ·
                    horario del turno: {state.horaInicio || "--:--"} – {state.horaFin || "--:--"}
                </p>

                {/* Autofill — distribuye horarios uniformemente */}
                <button
                    type="button"
                    disabled={!canAutofill}
                    onClick={() =>
                        onChange({
                            paradas: autofillHorarios(
                                state.paradas,
                                state.horaInicio,
                                state.horaFin,
                            ),
                        })
                    }
                    title={
                        canAutofill
                            ? "Distribuir horarios uniformemente entre inicio y fin"
                            : "Define hora de inicio y fin en el paso anterior"
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Distribuir horarios
                </button>
            </div>

            {/* Lista de paradas con nombre real */}
            <div className="overflow-hidden rounded-xl border border-slate-200">
                {/* Encabezado de la "tabla" */}
                <div className="grid grid-cols-[2.5rem_1fr_8rem] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <span className="text-center">#</span>
                    <span>Parada</span>
                    <span className="text-center">Abordaje</span>
                </div>

                {state.paradas.map((p, idx) => {
                    const fueraDeVentana = isHoraFueraDeVentana(
                        p.hora_abordaje,
                        state.horaInicio,
                        state.horaFin,
                    );

                    return (
                        <div
                            key={p.id_parada}
                            className="grid grid-cols-[2.5rem_1fr_8rem] items-center gap-3 border-b border-slate-100 px-4 py-2 last:border-b-0 hover:bg-slate-50/50"
                        >
                            {/* Número de orden */}
                            <span className="text-center text-sm font-semibold text-slate-400">
                                {p.numero ?? idx + 1}
                            </span>

                            {/* Nombre REAL de la parada — no "Parada N" */}
                            <span className="truncate text-sm text-slate-700" title={p.nombre}>
                                {p.nombre ?? `Parada ${p.id_parada}`}
                            </span>

                            {/* Hora de abordaje con validación visual */}
                            <div className="flex justify-center">
                                <Input
                                    type="time"
                                    value={p.hora_abordaje ?? ""}
                                    onChange={(e) => updateHora(idx, e.target.value)}
                                    aria-label={`Hora de abordaje de ${p.nombre ?? `parada ${idx + 1}`}`}
                                    className={
                                        fueraDeVentana
                                            ? "border-amber-400 ring-1 ring-amber-300 focus-visible:ring-amber-400"
                                            : ""
                                    }
                                    title={
                                        fueraDeVentana
                                            ? "Este horario está fuera de la ventana del turno"
                                            : undefined
                                    }
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-xs text-slate-400">
                Los horarios con borde ámbar están fuera de la ventana del turno —
                revísalos antes de guardar.
            </p>
        </div>
    );
};