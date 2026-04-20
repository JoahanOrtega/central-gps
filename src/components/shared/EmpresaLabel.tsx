// Label estático con el nombre de la empresa activa.
//
// Uso: mostrar la empresa del usuario cliente (admin_empresa o usuario)
// en el navbar. Reemplaza al botón selector que solo debe ver el sudo_erp.
//
// DECISIÓN DE UX
// Se eligió un label plano en lugar de un botón o chip interactivo porque:
//   - El cliente NO puede cambiar de empresa (modelo 1:N).
//   - Un elemento con apariencia clickeable generaría confusión o
//     expectativas rotas — cumple la Ley de Affordances Inversas: la
//     apariencia debe reflejar la capacidad.
//   - El patrón "Empresa: <nombre>" es universal en aplicaciones SaaS
//     (Slack, Shopify, Google Workspace) — Ley de Jakob.
//
// ACCESIBILIDAD
//   - Sin role ni tabindex: es contenido informativo, no interactivo.
//   - El ícono tiene aria-hidden; el texto lleva toda la información.

import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmpresaLabelProps {
    nombre: string | null | undefined;
    /** Permite sobreescribir estilos desde el padre (ej. responsive). */
    className?: string;
}

export const EmpresaLabel = ({ nombre, className }: EmpresaLabelProps) => {
    // Si no hay nombre (caso transitorio al restaurar sesión), mostrar un
    // placeholder neutro en lugar de vacío para que el navbar no "salte"
    // al llegar el dato (evita jank visual — layout shift).
    const texto = nombre?.trim() || "—";

    return (
        <div
            className={cn(
                "flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 md:px-4 md:py-2",
                className,
            )}
        >
            <Building2
                className="h-4 w-4 shrink-0 text-slate-500"
                aria-hidden="true"
            />
            <div className="flex items-center gap-1.5 text-sm">
                <span
                    className="max-w-[140px] truncate font-semibold text-slate-700 sm:max-w-[200px] lg:max-w-[260px]"
                    title={texto} 
                >
                    {texto}
                </span>
            </div>
        </div>
    );
};