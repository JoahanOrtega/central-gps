// ── Componente de estado vacío con call-to-action ─────────────
//
// Principio UX (Jakob Nielsen #1 — Visibilidad del estado):
// Cuando no hay datos, el usuario necesita saber:
//   1. Por qué no hay datos
//   2. Qué puede hacer al respecto
//
// Dos variantes:
//   "empty"  → La lista está vacía — invitar a crear el primer elemento
//   "search" → La búsqueda no tuvo resultados — invitar a limpiar el filtro

import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    // Ícono representativo del tipo de contenido
    icon: LucideIcon;
    // Título principal — describe el estado
    title: string;
    // Descripción secundaria — orienta al usuario
    description: string;
    // Texto del botón de acción (opcional)
    actionLabel?: string;
    // Función del botón de acción (opcional)
    onAction?: () => void;
}

export const EmptyState = ({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
}: EmptyStateProps) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
        {/* Ícono en contenedor suave */}
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Icon className="h-8 w-8 text-slate-400" />
        </div>

        {/* Texto */}
        <h3 className="text-base font-semibold text-slate-700">{title}</h3>
        <p className="mt-1 max-w-xs text-sm text-slate-400">{description}</p>

        {/* CTA — solo si se proporciona */}
        {actionLabel && onAction && (
            <button
                type="button"
                onClick={onAction}
                className="mt-5 rounded-lg border border-emerald-400 bg-white px-5 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
                {actionLabel}
            </button>
        )}
    </div>
);