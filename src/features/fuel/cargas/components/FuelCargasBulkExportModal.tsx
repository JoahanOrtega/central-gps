import { useState } from "react";
import { Download, FileText, Settings, FileSpreadsheet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface FuelCargasBulkExportModalProps {
  open: boolean;
  onClose: () => void;
  onExportAll: (fileName: string) => Promise<void>;
  onDownloadTemplate: () => Promise<void>;
}

export const FuelCargasBulkExportModal = ({
  open,
  onClose,
  onExportAll,
  onDownloadTemplate,
}: FuelCargasBulkExportModalProps) => {
  const [exportType, setExportType] = useState<"template" | "all">("template");
  const [fileName, setFileName] = useState("cargas_combustible");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExport = async () => {
    setIsSubmitting(true);
    try {
      if (exportType === "template") {
        await onDownloadTemplate();
      } else {
        const cleanName = fileName.trim() || "exportacion_cargas";
        const finalName = cleanName.endsWith(".xlsx") ? cleanName : `${cleanName}.xlsx`;
        await onExportAll(finalName);
      }
      onClose();
    } catch (error) {
      console.error("Error al exportar:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md bg-white p-6 rounded-xl shadow-lg flex flex-col gap-4 border border-slate-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800 text-base font-bold">
            <Download className="h-5 w-5 text-blue-600" />
            Exportación de Combustible
          </DialogTitle>
          <DialogDescription>
            Selecciona la opción de descarga que necesitas para la gestión de cargas.
          </DialogDescription>
        </DialogHeader>

        <hr className="border-slate-100" />

        <div className="flex flex-col gap-3">
          <label
            className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
              exportType === "template"
                ? "border-blue-600 bg-blue-50/40 text-blue-900"
                : "border-slate-200 hover:bg-slate-50 text-slate-700"
            }`}
          >
            <input
              type="radio"
              name="exportType"
              checked={exportType === "template"}
              onChange={() => setExportType("template")}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <FileSpreadsheet className={`h-5 w-5 ${exportType === "template" ? "text-blue-600" : "text-slate-400"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase">Descargar Plantilla Base</span>
              <span className="text-[11px] text-slate-500">Obtén el archivo Excel con las columnas requeridas para importación.</span>
            </div>
          </label>

          <label
            className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
              exportType === "all"
                ? "border-blue-600 bg-blue-50/40 text-blue-900"
                : "border-slate-200 hover:bg-slate-50 text-slate-700"
            }`}
          >
            <input
              type="radio"
              name="exportType"
              checked={exportType === "all"}
              onChange={() => setExportType("all")}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <FileText className={`h-5 w-5 ${exportType === "all" ? "text-blue-600" : "text-slate-400"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase">Exportar Todas las Cargas</span>
              <span className="text-[11px] text-slate-500">Descarga un respaldo completo de las cargas del sistema.</span>
            </div>
          </label>
        </div>

        {exportType === "all" && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5 animation-fade-in animate-in fade-in zoom-in-95 duration-200">
            <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
              <Settings className="h-3 w-3" /> Nombre del Archivo Destino
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="ej. cargas_totales_2026"
                className="w-full h-9 pl-3 pr-12 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              />
              <span className="absolute right-3 text-[11px] font-medium text-slate-400 pointer-events-none">
                .xlsx
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg uppercase transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleExport}
            className="h-9 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg uppercase flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            {isSubmitting ? "Procesando..." : "Descargar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};