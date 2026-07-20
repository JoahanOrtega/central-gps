import type { DashboardPeriodo } from "../types/dashboard.types";

const OPCIONES: { value: DashboardPeriodo; label: string }[] = [
    { value: "hoy", label: "Hoy" },
    { value: "7d", label: "7 días" },
    { value: "30d", label: "30 días" },
];

interface PeriodSelectorProps {
    value: DashboardPeriodo;
    onChange: (periodo: DashboardPeriodo) => void;
}

// Selector de periodo del dashboard: Hoy / 7 días / 30 días. Se usa en
// DashboardPage y en el modal de detalle de unidad.
export const PeriodSelector = ({ value, onChange }: PeriodSelectorProps) => (
    <div
        role="group"
        aria-label="Periodo del dashboard"
        className="grid w-full grid-cols-3 overflow-hidden rounded-lg border border-slate-200 sm:w-auto sm:inline-flex"
    >
        {OPCIONES.map((opcion, i) => {
            const activo = opcion.value === value;
            return (
                <button
                    key={opcion.value}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => onChange(opcion.value)}
                    className={[
                        "h-9 px-4 text-sm font-medium transition-colors",
                        i > 0 ? "border-l border-slate-200" : "",
                        activo
                            ? "bg-sky-50 text-sky-700"
                            : "bg-white text-slate-500 hover:bg-slate-50",
                    ].join(" ")}
                >
                    {opcion.label}
                </button>
            );
        })}
    </div>
);