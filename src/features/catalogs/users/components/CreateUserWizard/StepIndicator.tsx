import { Check } from "lucide-react";

// ─── Stepper visual del wizard ────────────────────────────────────────────────
//
// Patrón estándar de wizards modernos (Stripe, Linear, Vercel):
//   - Círculos numerados unidos por una línea
//   - El paso actual se resalta en azul
//   - Los pasos completados muestran ✓ verde
//   - Los pasos futuros se ven en gris
//
// Decisiones de diseño:
//   - aria-current="step" en el círculo activo para que lectores de pantalla
//     anuncien "paso 2 de 3, current step".
//   - Los labels debajo de cada círculo siempre se ven (no en hover) porque
//     en mobile no hay hover y el usuario necesita saber dónde está.
//   - La línea entre pasos NO es clickable. Si el usuario quiere volver,
//     usa el botón "Anterior" del footer del wizard. Esto evita saltos
//     accidentales que se brinquen validación de pasos previos.

interface Step {
    id: number;
    label: string;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: number;
}

export const StepIndicator = ({ steps, currentStep }: StepIndicatorProps) => {
    return (
        <div className="relative" role="list" aria-label="Progreso del wizard">
            {/* Línea base gris que cruza todos los pasos.
                Posicionada absolute al 14px (mitad del círculo de 28px) para
                que pase por el centro vertical. left/right del 16.66% para
                que NO se extienda más allá de los círculos extremos. */}
            <div
                className="absolute left-[16.66%] right-[16.66%] top-[14px] h-[2px] bg-slate-200"
                aria-hidden="true"
            />

            {/* Línea de progreso azul superpuesta — del primer círculo al actual.
                Para 3 pasos:  paso 1 → 0%, paso 2 → ~33%, paso 3 → ~66%.
                El (100 - 33.33) compensa el ancho que ocupa el último círculo. */}
            <div
                className="absolute left-[16.66%] top-[14px] h-[2px] bg-blue-500 transition-all duration-300"
                style={{
                    width: `${((currentStep - 1) / (steps.length - 1)) * (100 - 33.33)}%`,
                }}
                aria-hidden="true"
            />

            {/* Grid de círculos. Soporta cualquier N de pasos sin código adicional. */}
            <div
                className="relative grid"
                style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
            >
                {steps.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;

                    return (
                        <div
                            key={step.id}
                            role="listitem"
                            className="flex flex-col items-center gap-1.5"
                        >
                            <div
                                aria-current={isCurrent ? "step" : undefined}
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${isCompleted
                                    ? "bg-emerald-500 text-white"
                                    : isCurrent
                                        ? "bg-blue-500 text-white"
                                        : "bg-slate-200 text-slate-500"
                                    }`}
                            >
                                {isCompleted ? (
                                    <Check className="h-4 w-4" aria-hidden="true" />
                                ) : (
                                    step.id
                                )}
                            </div>
                            <span
                                className={`text-xs ${isCurrent
                                    ? "font-medium text-blue-600"
                                    : isCompleted
                                        ? "text-emerald-600"
                                        : "text-slate-500"
                                    }`}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};