import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationInfo } from "@/hooks/usePagination";

interface PaginationProps {
    pagination: PaginationInfo;
}

/**
 * Controles de paginación para catálogos.
 *
 * Muestra: "Mostrando X - Y de Z", botones de página con elipsis, y
 * flechas de anterior/siguiente. Solo se renderiza si hay más de una
 * página — si todo cabe en una, no aparece nada.
 *
 * @example
 *   const { paginatedItems, pagination } = usePagination(clients, 12);
 *   <CatalogGrid items={paginatedItems} pagination={pagination} />
 *   // CatalogGrid renderiza <Pagination> internamente
 */
export const Pagination = ({ pagination }: PaginationProps) => {
    const { page, totalPages, totalItems, from, to, hasPrev, hasNext, goTo, prev, next } = pagination;

    // No mostrar paginación si todo cabe en una página
    if (totalPages <= 1) return null;

    // Generar los números de página visibles (con elipsis si hay muchas)
    const pageNumbers = buildPageNumbers(page, totalPages);

    return (
        <nav
            aria-label="Paginación"
            className="flex flex-col items-center justify-between gap-3 pt-4 sm:flex-row"
        >
            {/* Texto informativo */}
            <p className="text-sm text-slate-500">
                Mostrando <span className="font-medium text-slate-700">{from}</span>
                {" - "}
                <span className="font-medium text-slate-700">{to}</span>
                {" de "}
                <span className="font-medium text-slate-700">{totalItems}</span>
                {" registros"}
            </p>

            {/* Controles */}
            <div className="flex items-center gap-1">
                {/* Anterior */}
                <button
                    type="button"
                    onClick={prev}
                    disabled={!hasPrev}
                    aria-label="Página anterior"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Números de página */}
                {pageNumbers.map((item, i) =>
                    item === "..." ? (
                        <span
                            key={`ellipsis-${i}`}
                            className="flex h-9 w-9 items-center justify-center text-sm text-slate-400"
                        >
                            ...
                        </span>
                    ) : (
                        <button
                            key={item}
                            type="button"
                            onClick={() => goTo(item)}
                            aria-current={item === page ? "page" : undefined}
                            className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium ${item === page
                                    ? "bg-cyan-500 text-white"
                                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                        >
                            {item}
                        </button>
                    ),
                )}

                {/* Siguiente */}
                <button
                    type="button"
                    onClick={next}
                    disabled={!hasNext}
                    aria-label="Página siguiente"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </nav>
    );
};

/**
 * Calcula qué números de página mostrar, con elipsis si hay muchas.
 *
 * Siempre muestra la primera, la última, la actual y 1 vecina a cada lado.
 * Ejemplos con 10 páginas:
 *   página 1:  [1, 2, 3, "...", 10]
 *   página 5:  [1, "...", 4, 5, 6, "...", 10]
 *   página 10: [1, "...", 8, 9, 10]
 */
function buildPageNumbers(
    current: number,
    total: number,
): (number | "...")[] {
    // Si hay pocas páginas, mostrar todas sin elipsis
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set<number>();

    // Siempre primera y última
    pages.add(1);
    pages.add(total);

    // Actual + vecinas
    for (let i = current - 1; i <= current + 1; i++) {
        if (i >= 1 && i <= total) pages.add(i);
    }

    // Ordenar y agregar elipsis donde hay saltos
    const sorted = Array.from(pages).sort((a, b) => a - b);
    const result: (number | "...")[] = [];

    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
            result.push("...");
        }
        result.push(sorted[i]);
    }

    return result;
}