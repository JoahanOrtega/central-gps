// Pills de período (Hoy / Ayer / 7 días / 30 días).
// SRP: solo renderiza los presets y notifica selección. No conoce fechas.

import { cn } from "@/lib/utils";
import { PRESETS, type PresetId } from "../hooks/useEventosFilters";

interface PeriodPresetsProps {
    activeId: PresetId;
    onSelect: (id: PresetId) => void;
}

export const PeriodPresets = ({ activeId, onSelect }: PeriodPresetsProps) => (
    <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Períodos predefinidos">
        {PRESETS.map((p) => {
            const isActive = activeId === p.id;
            return (
                <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelect(p.id)}
                    aria-pressed={isActive}
                    className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        isActive
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100",
                    )}
                >
                    {p.label}
                </button>
            );
        })}
    </div>
);