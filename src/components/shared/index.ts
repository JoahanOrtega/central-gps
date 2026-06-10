// Cajas negras compartidas del proyecto

// Componentes visuales
export { CatalogLayout } from "./CatalogLayout";
export { CatalogHeader } from "./CatalogHeader";
export { CatalogGrid } from "./CatalogGrid";
export { KebabMenu } from "./KebabMenu";
export type { KebabMenuItem } from "./KebabMenu";

export { ModalWithTabs }  from "./ModalWithTabs";
export type { ModalTab }  from "./ModalWithTabs";

// Componentes de formulario
export { Field, RadioOption, inputClass } from "./form-helpers";
export { GeoFenceTab }    from "./GeoFenceTab";
export type { GeoFenceValue } from "./GeoFenceTab";

// Hooks
export { useDebounce } from "../../hooks/useDebounce";
export { useDeleteConfirm } from "../../hooks/useDeleteConfirm";
export { usePagination } from "../../hooks/usePagination";

export { EmptyState }    from "./EmptyState";
export { ErrorBanner }   from "./ErrorBanner";
export { PoiCardSkeleton }  from "./SkeletonCard";
export { ConfirmDialog } from "./ConfirmDialog";
export { SaveButton }    from "./SaveButton";