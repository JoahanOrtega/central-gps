// Paginación de la tabla de eventos.
// SRP: solo presentación de los controles de navegación de páginas.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventsPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const EventsPagination = ({
    currentPage,
    totalPages,
    onPageChange,
}: EventsPaginationProps) => {
    if (totalPages <= 1) return null;

    const canPrev = currentPage > 1;
    const canNext = currentPage < totalPages;

    const goPrev = () => canPrev && onPageChange(currentPage - 1);
    const goNext = () => canNext && onPageChange(currentPage + 1);

    return (
        <nav
            className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"
            aria-label="Paginación de eventos"
        >
            <span className="text-xs text-slate-500" aria-live="polite">
                Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
                <PaginationButton
                    onClick={goPrev}
                    disabled={!canPrev}
                    ariaLabel="Página anterior"
                >
                    <ChevronLeft className="h-4 w-4" />
                </PaginationButton>
                <PaginationButton
                    onClick={goNext}
                    disabled={!canNext}
                    ariaLabel="Página siguiente"
                >
                    <ChevronRight className="h-4 w-4" />
                </PaginationButton>
            </div>
        </nav>
    );
};

interface PaginationButtonProps {
    onClick: () => void;
    disabled: boolean;
    ariaLabel: string;
    children: React.ReactNode;
}

const PaginationButton = ({
    onClick,
    disabled,
    ariaLabel,
    children,
}: PaginationButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
            "rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors",
            "hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed",
        )}
    >
        {children}
    </button>
);