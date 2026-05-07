// Botón de guardado con tres estados visuales: idle → saving → saved.
//
// Estados:
//   idle    → "Guardar" (o el label que reciba)
//   saving  → spinner + "Guardando..."
//   saved   → checkmark verde + "Guardado" (durante 1.5s antes de volver a idle)

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

type SaveState = "idle" | "saving" | "saved";

interface SaveButtonProps {
    // Si está en proceso de guardado (isPending de useMutation)
    isSaving: boolean;
    // Si el guardado fue exitoso — trigger para pasar a estado "saved"
    isSaved?: boolean;
    // Label en estado idle (default: "Guardar")
    label?: string;
    // Si mostrar el estado "Guardado ✓" por 1.5s antes de volver a idle.
    // Desactivar cuando el modal se cierra inmediatamente tras guardar.
    showSavedFeedback?: boolean;
    // Si el botón debe estar deshabilitado independientemente del estado
    disabled?: boolean;
    // Callback al hacer click
    onClick?: () => void;
    // Clases adicionales para personalizar el botón
    className?: string;
    // Tipo de botón (default: "button")
    type?: "button" | "submit";
}

export const SaveButton = ({
    isSaving,
    isSaved = false,
    label = "Guardar",
    showSavedFeedback = true,
    disabled = false,
    onClick,
    className = "",
    type = "button",
}: SaveButtonProps) => {
    const [saveState, setSaveState] = useState<SaveState>("idle");

    // Transición: idle → saving cuando isSaving cambia a true
    useEffect(() => {
        if (isSaving) {
            setSaveState("saving");
        }
    }, [isSaving]);

    // Transición: saving → saved → idle cuando isSaved cambia a true
    useEffect(() => {
        if (!isSaved || !showSavedFeedback) return;

        setSaveState("saved");

        // Volver a idle después de 1.5s — suficiente para que el usuario lo vea
        // sin que el feedback se prolongue más de lo necesario.
        const timer = setTimeout(() => setSaveState("idle"), 1500);
        return () => clearTimeout(timer);
    }, [isSaved, showSavedFeedback]);

    const isDisabled = disabled || saveState === "saving";

    // Clases de color según el estado — verde en "saved" para refuerzo positivo
    const colorClasses = {
        idle: "bg-blue-600 hover:bg-blue-700 text-white",
        saving: "bg-blue-600 text-white cursor-wait",
        saved: "bg-emerald-500 text-white",
    }[saveState];

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisabled}
            className={`
                flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${colorClasses}
                ${className}
            `.trim()}
        >
            {saveState === "saving" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            {saveState === "saved" && (
                <Check className="h-3.5 w-3.5" />
            )}

            {saveState === "idle" && label}
            {saveState === "saving" && "Guardando..."}
            {saveState === "saved" && "Guardado"}
        </button>
    );
};