// Estado vacío con call-to-action contextual.

import type { LucideIcon } from "lucide-react";

type EmptyVariant = "empty" | "search" | "error";

interface EmptyStateProps {
    // Ícono representativo del tipo de contenido
    icon: LucideIcon;
    // Título principal — describe el estado sin jerga técnica
    title: string;
    // Descripción secundaria — orienta al usuario con acción concreta
    description: string;
    // Texto del botón de acción (opcional)
    actionLabel?: string;
    // Función del botón de acción (opcional)
    onAction?: () => void;
    // Variante visual (default: "empty")
    variant?: EmptyVariant;
}

const VARIANT_STYLES: Record<EmptyVariant, { bg: string; icon: string; btn: string }> = {
    empty: {
        bg: "bg-slate-100",
        icon: "text-slate-400",
        btn: "border-emerald-400 text-emerald-600 hover:bg-emerald-50",
    },
    search: {
        bg: "bg-blue-50",
        icon: "text-blue-400",
        btn: "border-blue-400 text-blue-600 hover:bg-blue-50",
    },
    error: {
        bg: "bg-red-50",
        icon: "text-red-400",
        btn: "border-red-300 text-red-600 hover:bg-red-50",
    },
};

export const EmptyState = ({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    variant = "empty",
}: EmptyStateProps) => {
    const styles = VARIANT_STYLES[variant];

    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            {/* Ícono en contenedor con fondo semántico según variante */}
            <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${styles.bg}`}>
                <Icon className={`h-8 w-8 ${styles.icon}`} />
            </div>

            {/* Texto */}
            <h3 className="text-base font-semibold text-slate-700">{title}</h3>
            <p className="mt-1 max-w-xs text-sm text-slate-400">{description}</p>

            {/* CTA — solo si se proporciona */}
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className={`mt-5 rounded-lg border bg-white px-5 py-2 text-sm font-medium transition-colors ${styles.btn}`}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};