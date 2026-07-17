import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * Etiqueta OBLIGATORIA del botón. Alimenta a la vez el tooltip nativo
     * (title) y el aria-label — un botón de solo-icono sin etiqueta es
     * invisible para lectores de pantalla y un acertijo para el usuario
     * nuevo. Hacerla obligatoria a nivel de tipo garantiza que ningún
     * botón futuro nazca mudo.
     */
    label: string;
    children: ReactNode;
    /** Estado activo/presionado (toggles como "Ver tráfico"). */
    active?: boolean;
}

/**
 * Botón de solo-icono con accesibilidad garantizada por construcción.
 *
 * Único componente permitido para botones de icono en la app: centraliza
 * el estilo (mismo look en toolbar, headers y paneles) y la accesibilidad
 * (title + aria-label + aria-pressed) en un solo lugar, en vez de repetir
 * el mismo bloque de <button> con clases en cada archivo.
 *
 * forwardRef: necesario para usarlo como trigger de DropdownMenu/Tooltip
 * de Radix (asChild inyecta el ref).
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ label, children, active = false, className, ...props }, ref) => (
        <button
            ref={ref}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active || undefined}
            className={cn(
                "flex h-9 w-9 flex-none items-center justify-center rounded-md border transition-colors md:h-10 md:w-10",
                active
                    ? "border-sky-300 bg-sky-50 text-sky-600"
                    : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                className,
            )}
            {...props}
        >
            {children}
        </button>
    ),
);

IconButton.displayName = "IconButton";
