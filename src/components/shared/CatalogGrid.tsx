import type { LucideIcon } from "lucide-react";
import { SkeletonGrid } from "@/components/shared/SkeletonCard";
import { EmptyState } from "@/components/shared/EmptyState";
import type { ComponentProps } from "react";

type SkeletonVariant = ComponentProps<typeof SkeletonGrid>["variant"];

interface CatalogGridProps<T> {
  // Estado de la query
  isLoading: boolean;
  errorMessage: string | null;
  items: T[];
  // Texto de búsqueda activo — cambia el mensaje del empty state
  activeSearch?: string;

  // Render de cada card
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string | number;

  // Skeleton
  skeletonVariant: SkeletonVariant;
  skeletonCount?: number;

  // Empty state — ícono y textos
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  searchEmptyTitle?: string;
  searchEmptyDescription?: string;
  onClearSearch?: () => void;

  // Error
  errorTitle?: string;
  onRetry?: () => void;

  // Columnas del grid — por defecto 2 en pantallas grandes
  gridCols?: "1" | "2" | "3";
}

/**
 * Grid estándar de catálogos con skeleton, empty state y manejo de error
 * integrados. Elimina el bloque repetido de condiciones que existe en
 * UnitsCatalogView, PointsOfInterestView, UsersCatalogView y ClientsCatalogView.
 */
export const CatalogGrid = <T,>({
  isLoading,
  errorMessage,
  items,
  activeSearch,
  renderItem,
  keyExtractor,
  skeletonVariant,
  skeletonCount = 6,
  icon,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  searchEmptyTitle = "Sin resultados",
  searchEmptyDescription,
  onClearSearch,
  errorTitle = "No se pudieron cargar los registros",
  onRetry,
  gridCols = "2",
}: CatalogGridProps<T>) => {
  // Mapa de clases de grid
  const gridClass = {
    "1": "grid grid-cols-1 gap-4 md:gap-6",
    "2": "grid grid-cols-1 gap-4 md:gap-6 2xl:grid-cols-2",
    "3": "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
  }[gridCols];

  if (isLoading) {
    return <SkeletonGrid variant={skeletonVariant} count={skeletonCount} />;
  }

  if (errorMessage) {
    return (
      <EmptyState
        icon={icon}
        title={errorTitle}
        description={errorMessage}
        actionLabel={onRetry ? "Reintentar" : undefined}
        onAction={onRetry}
        variant="error"
      />
    );
  }

  if (items.length === 0) {
    // Sin resultados de búsqueda
    if (activeSearch) {
      return (
        <EmptyState
          icon={icon}
          title={searchEmptyTitle}
          description={
            searchEmptyDescription ??
            `No se encontraron registros que coincidan con "${activeSearch}".`
          }
          actionLabel={onClearSearch ? "Limpiar búsqueda" : undefined}
          onAction={onClearSearch}
          variant="search"
        />
      );
    }

    // Sin datos en absoluto
    return (
      <EmptyState
        icon={icon}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className={gridClass}>
      {items.map((item) => (
        <div key={keyExtractor(item)}>{renderItem(item)}</div>
      ))}
    </div>
  );
};