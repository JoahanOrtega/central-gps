import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

interface KpiCardProps {
    icono: ReactNode;
    titulo: string;
    // El número protagonista — patrón Stripe: primero el QUÉ en grande,
    // el desglose después en texto secundario.
    valor: string;
    sufijo?: string;
    subtitulo: string;
    // Tono del valor. Los excesos van en rojo SOLO cuando hay (>0):
    // el color debe significar algo, no decorar.
    tonoValor?: string;
    loading?: boolean;
    onClick?: () => void;
    hint?: string;
}

export const KpiCard = ({
    icono,
    titulo,
    valor,
    sufijo,
    subtitulo,
    tonoValor = "text-slate-800",
    loading = false,
    onClick,
    hint,
}: KpiCardProps) => {
    if (loading) {
        return (
            <article className="animate-pulse p-4 md:p-6">
                <div className="mb-3 h-4 w-24 rounded bg-slate-200" />
                <div className="mb-2 h-8 w-20 rounded bg-slate-200" />
                <div className="h-3 w-32 rounded bg-slate-200" />
            </article>
        );
    }

    return (
        <article
            onClick={onClick}
            title={hint}
            className={`group relative p-4 md:p-6 ${onClick
                    ? "cursor-pointer transition-colors hover:bg-slate-50"
                    : ""
                }`}
        >
            <div className="mb-2 flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
                    <span className="text-slate-400">{icono}</span>
                    {titulo}
                </p>
                {onClick && (
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                )}
            </div>

            <p className={`text-2xl font-semibold tabular-nums md:text-3xl ${tonoValor}`}>
                {valor}
                {sufijo && (
                    <span className="ml-1 text-sm font-normal text-slate-400">
                        {sufijo}
                    </span>
                )}
            </p>

            <p className="mt-1 truncate text-xs text-slate-400">{subtitulo}</p>
        </article>
    );
};