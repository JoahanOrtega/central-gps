import { useMemo, useState, useEffect } from "react";

/**
 * Información de paginación que consume el componente Pagination.
 * Separada del hook para que CatalogGrid la tipee sin importar el hook.
 */
export interface PaginationInfo {
    /** Página actual (1-indexed) */
    page: number;
    /** Total de páginas */
    totalPages: number;
    /** Total de items sin paginar */
    totalItems: number;
    /** Índice del primer item visible (1-indexed, para mostrar "X - Y de Z") */
    from: number;
    /** Índice del último item visible (1-indexed) */
    to: number;
    /** Items por página */
    pageSize: number;
    /** ¿Hay página anterior? */
    hasPrev: boolean;
    /** ¿Hay página siguiente? */
    hasNext: boolean;
    /** Ir a la página anterior */
    prev: () => void;
    /** Ir a la página siguiente */
    next: () => void;
    /** Ir a una página específica */
    goTo: (page: number) => void;
}

/**
 * Hook de paginación client-side.
 *
 * Recibe un array completo y devuelve solo los items de la página actual
 * más los controles de navegación. Diseñado para catálogos que ya cargan
 * todos sus datos de una vez.
 *
 * Si en el futuro se migra a paginación server-side, solo hay que cambiar
 * cómo se obtienen los items — el componente Pagination y CatalogGrid
 * no necesitan cambios porque usan la misma interfaz PaginationInfo.
 *
 * @param items     array completo de datos
 * @param pageSize  items por página (default 12 — 2 columnas x 6 filas)
 *
 * @example
 *   const { paginatedItems, pagination } = usePagination(clients, 12);
 *   <CatalogGrid items={paginatedItems} pagination={pagination} />
 */
export const usePagination = <T>(items: T[], pageSize = 12) => {
    const [page, setPage] = useState(1);

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    // Si la lista se reduce (ej: búsqueda) y la página actual ya no existe,
    // volver a la 1. Sin esto, el usuario quedaría en una página vacía.
    useEffect(() => {
        if (page > totalPages) setPage(1);
    }, [page, totalPages]);

    // Resetear a página 1 cuando cambian los items (ej: nueva búsqueda)
    useEffect(() => {
        setPage(1);
    }, [totalItems]);

    const paginatedItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [items, page, pageSize]);

    const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalItems);

    const pagination: PaginationInfo = {
        page,
        totalPages,
        totalItems,
        from,
        to,
        pageSize,
        hasPrev: page > 1,
        hasNext: page < totalPages,
        prev: () => setPage((p) => Math.max(1, p - 1)),
        next: () => setPage((p) => Math.min(totalPages, p + 1)),
        goTo: (target: number) => setPage(Math.max(1, Math.min(totalPages, target))),
    };

    return { paginatedItems, pagination };
};