import { useState } from "react";
import { notify } from "@/stores/notificationStore";

interface UseDeleteConfirmOptions<T> {
  // Función que ejecuta el DELETE en el backend
  deleteFn: (item: T) => Promise<void>;
  // Mensaje de éxito después de eliminar
  successMessage: (item: T) => string;
  // Mensaje de error si falla (opcional — usa uno genérico si no se pasa)
  errorMessage?: string;
  // Callback opcional después de eliminar con éxito (ej: invalidar caché)
  onSuccess?: () => void;
}

interface UseDeleteConfirmReturn<T> {
  // El item que se va a eliminar — null cuando el confirm está cerrado
  itemToDelete: T | null;
  isDeleting: boolean;
  // Abrir el confirm con el item seleccionado
  askDelete: (item: T) => void;
  // Cancelar sin eliminar
  cancelDelete: () => void;
  // Ejecutar el DELETE
  confirmDelete: () => Promise<void>;
}

/**
 * Encapsula el flujo completo de confirmación y eliminación:
 *   1. askDelete(item)    → abre el ConfirmDialog
 *   2. confirmDelete()    → ejecuta el DELETE y notifica
 *   3. cancelDelete()     → cierra sin hacer nada
 *   />
 */
export const useDeleteConfirm = <T>({
  deleteFn,
  successMessage,
  errorMessage,
  onSuccess,
}: UseDeleteConfirmOptions<T>): UseDeleteConfirmReturn<T> => {
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const askDelete = (item: T) => setItemToDelete(item);

  const cancelDelete = () => {
    // No cerrar si hay un DELETE en curso
    if (!isDeleting) setItemToDelete(null);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteFn(itemToDelete);
      notify.success(successMessage(itemToDelete));
      setItemToDelete(null);
      onSuccess?.();
    } catch (err) {
      notify.error(
        errorMessage ??
          (err instanceof Error ? err.message : "No fue posible eliminar el registro"),
      );
      // No cerrar el confirm en error el usuario decide si reintentar o cancelar
    } finally {
      setIsDeleting(false);
    }
  };

  return { itemToDelete, isDeleting, askDelete, cancelDelete, confirmDelete };
};