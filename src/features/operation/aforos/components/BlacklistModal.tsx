import { useState } from "react";
import { Ban, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { AforoItem } from "../types/aforo.types";

interface BlacklistModalProps {
  open: boolean;
  onClose: () => void;
  blacklistItems: AforoItem[];
  onRemove: (idAforo: number) => void;
}

const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "---";
  try {
    const standardizedStr = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
    const date = new Date(standardizedStr);
    if (isNaN(date.getTime())) return dateStr;

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch {
    return dateStr;
  }
};

export const BlacklistModal = ({
  open,
  onClose,
  blacklistItems,
  onRemove,
}: BlacklistModalProps) => {
  const [itemToRestore, setItemToRestore] = useState<AforoItem | null>(null);

  const handleConfirmRestore = () => {
    if (itemToRestore) {
      onRemove(itemToRestore.id_aforo);
      setItemToRestore(null); 
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-4xl bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 text-base uppercase font-bold">
              <Ban className="h-5 w-5 text-red-500" />
              Lista Negra de Aforos
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs mt-1">
              Historial de códigos, tarjetas y personal restringido. Los elementos aquí listados no aparecerán en el catálogo principal de accesos operacionales.
            </DialogDescription>
          </DialogHeader>

          <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white mt-4 max-h-[50vh] overflow-y-auto">
            {blacklistItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs uppercase font-medium">
                No hay registros en la lista negra
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-700 data-table">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-16 text-center">#</th>
                    <th className="px-4 py-3 font-semibold">RFID / Clave</th>
                    <th className="px-4 py-3 font-semibold">Fecha de Bloqueo</th>
                    <th className="px-4 py-3 font-semibold">Nombre / Detalle</th>
                    <th className="px-4 py-3 font-semibold text-right w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {blacklistItems.map((item, index) => (
                    <tr key={item.id_aforo} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-center font-medium text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 font-mono">
                        <div className="text-slate-900 font-semibold">{item.rfid || "---"}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.clave || "SIN CLAVE"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                        {formatDateTime(item.blacklist_date || item.fecha_asignacion)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {item.nombre || item.cliente_ruta || "---"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setItemToRestore(item)} 
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors uppercase font-semibold"
            >
              Cerrar Lista
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={itemToRestore !== null}
        onOpenChange={(open) => !open && setItemToRestore(null)}
        title="Restablecer Aforo"
        description={`¿Estás seguro de que deseas quitar a "${itemToRestore?.nombre || itemToRestore?.rfid || 'este registro'}" de la lista negra y devolverlo al catálogo activo?`}
        confirmText="RESTABLECER"
        confirmButtonClassName="bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50"
        onConfirm={handleConfirmRestore}
      />
    </>
  );
};