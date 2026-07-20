import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle, Trash2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"; 
import type { UnidadCatalogo, FuelCargaItem } from "../types/fuelCargas.types"; 
import ExcelJS from "exceljs";

interface FuelCargasBulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  unidades: UnidadCatalogo[]; 
  existingCargas: FuelCargaItem[]; 
  onImportConfirmed: (items: any[]) => Promise<void>;
} 

interface PrevisualizacionCarga {
  unidad: string; 
  gasolinera: string | null;
  folio: string;
  fecha_carga: string;
  hora_carga: string | null;
  kms_odo: number;
  kms_vacio: number | null;
  litros: number;
  costo_litro: number;
  importe: number; 
  referencia: string | null;
  archivo_origen: string;
} 

export const FuelCargasBulkUploadModal = ({
  open,
  onClose,
  unidades, 
  existingCargas,
  onImportConfirmed,
}: FuelCargasBulkUploadModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const [parsedItems, setParsedItems] = useState<PrevisualizacionCarga[]>([]); 
  const [loadedFiles, setLoadedFiles] = useState<string[]>([]); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [ignoredCount, setIgnoredCount] = useState(0); 
  const [showEmptyWarning, setShowEmptyWarning] = useState(false); 
  const [showConfirmClose, setShowConfirmClose] = useState(false); 
  const [showInvalidFileAlert, setShowInvalidFileAlert] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; 
    if (!files || files.length === 0) return; 

    const filesArray = Array.from(files); 
    const newLoadedFiles: string[] = []; 
    
    let localAccumulated = [...parsedItems]; 
    let newItemsThisEvent: PrevisualizacionCarga[] = []; 
    let localIgnoredCount = 0; 

    setShowEmptyWarning(false); 
    setShowInvalidFileAlert(false);

    const existingFolios = new Set(existingCargas.map(c => c.folio?.trim().toLowerCase()).filter(Boolean));
    const localFolios = new Set(localAccumulated.map(c => c.folio?.trim().toLowerCase()).filter(Boolean));

    const unitsMap = new Map();
    unidades.forEach(u => {
      const econNum = u.nombre.split(" ")[0].trim().toLowerCase();
      unitsMap.set(econNum, u);
      unitsMap.set(u.nombre.trim().toLowerCase(), u);
    });

    for (const file of filesArray) {
      const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
      const isXlsx = file.name.toLowerCase().endsWith(".xlsx") || file.type.includes("spreadsheetml");

      if (!isCsv && !isXlsx) {
        setShowInvalidFileAlert(true);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return; 
      }

      if (loadedFiles.includes(file.name) || newLoadedFiles.includes(file.name)) {
        continue; 
      }

      try {
        let rowsData: any[] = [];

        if (isCsv) {
          const text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader(); 
            reader.onload = (event) => resolve((event.target?.result as string) || ""); 
            reader.onerror = () => reject(new Error("Error leyendo CSV")); 
            reader.readAsText(file); 
          });

          const lines = text.split(/\r?\n/).filter((line) => line.trim() !== ""); 
          if (lines.length > 1) {
            for (const line of lines.slice(1)) {
              const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) => v.replace(/^"|"$/g, "").trim()); 
              rowsData.push(values);
            }
          }
        } 
        else if (isXlsx) {
          const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
            reader.onerror = () => reject(new Error("Error leyendo XLSX"));
            reader.readAsArrayBuffer(file);
          });

          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          const worksheet = workbook.worksheets[0];

          if (worksheet) {
            worksheet.eachRow((row, rowNumber) => {
              if (rowNumber > 1) {
                const getVal = (col: number) => {
                  const cell = row.getCell(col);
                  if (!cell || cell.value === null || cell.value === undefined) return "";
                  
                  if (cell.type === ExcelJS.ValueType.Date && cell.value instanceof Date) {
                    const d = cell.value;
                    if (col === 2) {
                      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    }
                    const hh = String(d.getHours()).padStart(2, '0');
                    const mm = String(d.getMinutes()).padStart(2, '0');
                    if (hh !== "00" || mm !== "00") {
                      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${hh}:${mm}`;
                    }
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  }

                  if (cell.value && typeof cell.value === 'object' && 'result' in cell.value) {
                    return cell.value.result != null ? String(cell.value.result).trim() : "";
                  }

                  return cell.text?.trim() || String(cell.value).trim();
                };
                
                rowsData.push([
                  getVal(1), getVal(2), getVal(3), getVal(4), getVal(5), 
                  getVal(6), getVal(7), getVal(8), getVal(9), getVal(10)
                ]);
              }
            });
          }
        }

        if (rowsData.length === 0) {
          localIgnoredCount++; 
          continue; 
        }

        const fileItems: PrevisualizacionCarga[] = []; 

        for (const values of rowsData) { 
          const fecha_carga = (values[0] || "").trim(); 
          const hora_carga = (values[1] || "").trim() || null; 
          const gasolinera = (values[2] || "").trim() || null; 
          const folio = (values[3] || "").trim(); 
          const unidadStr = (values[4] || "").trim(); 
          const litros = parseFloat(values[5]) || 0; 
          const costo_litro = parseFloat(values[6]) || 0; 
          const kms_odo = parseFloat(values[7]); 
          const kms_vacio = parseFloat(values[8]);
          const referencia = (values[9] || "").trim() || null; 

          const importe = Number((litros * costo_litro).toFixed(2)); 
          const parsedKmsVacio = isNaN(kms_vacio) ? null : kms_vacio;

          if (!unidadStr || !folio || !fecha_carga || isNaN(kms_odo)) {
            localIgnoredCount++; 
            continue;  
          }

          const matchedUnit = unitsMap.get(unidadStr.toLowerCase()); 
          if (!matchedUnit) {
            localIgnoredCount++; 
            continue; 
          }

          const ultimoOdoRegistrado = Number(matchedUnit.odometro_physico) || 0;
          if (kms_odo < ultimoOdoRegistrado) {
            localIgnoredCount++;
            continue;
          }

          const kmsRecorridosEstimados = Math.max(0, kms_odo - ultimoOdoRegistrado);
          if (parsedKmsVacio !== null && parsedKmsVacio > kmsRecorridosEstimados) {
            localIgnoredCount++;
            continue;
          }

          const codigoEconomicoLimpio = matchedUnit.nombre.split(" ")[0].trim();

          const esFechaValida = (fecha: string): boolean => {
            const match = fecha.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$|^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (!match) return false;

            let year, month, day;
            if (match[1]) { 
              year = parseInt(match[1], 10);
              month = parseInt(match[2], 10);
              day = parseInt(match[3], 10);
            } else { 
              day = parseInt(match[4], 10);
              month = parseInt(match[5], 10);
              year = parseInt(match[6], 10);
            }

            if (month < 1 || month > 12) return false;
            const diasEnMes = new Date(year, month, 0).getDate();
            return day > 0 && day <= diasEnMes;
          };

          const soloFechaParte = fecha_carga.split(" ")[0];
          if (!esFechaValida(soloFechaParte)) {
            localIgnoredCount++; 
            continue; 
          }

          const folioBuscado = folio.trim().toLowerCase();
          const yaExisteEnBD = existingFolios.has(folioBuscado);
          const existeEnMemoriaLocal = localFolios.has(folioBuscado);

          if (yaExisteEnBD || existeEnMemoriaLocal) {
            localIgnoredCount++; 
            continue;  
          }

          const combinedFechaCarga = hora_carga ? `${soloFechaParte} ${hora_carga}` : fecha_carga;

          const nuevoItem: PrevisualizacionCarga = {
            unidad: codigoEconomicoLimpio, 
            gasolinera, 
            folio, 
            fecha_carga: combinedFechaCarga, 
            hora_carga, 
            kms_odo, 
            kms_vacio: parsedKmsVacio,
            litros, 
            costo_litro, 
            importe, 
            referencia, 
            archivo_origen: file.name,
          };

          localFolios.add(folioBuscado);
          fileItems.push(nuevoItem); 
          localAccumulated.push(nuevoItem); 
        }

        newItemsThisEvent = [...newItemsThisEvent, ...fileItems]; 
        newLoadedFiles.push(file.name); 
      } catch (err) {
        console.error(err); 
      }
    }

    if (newItemsThisEvent.length > 0) {
      setParsedItems((prev) => [...prev, ...newItemsThisEvent]); 
      setLoadedFiles((prev) => [...prev, ...newLoadedFiles]); 
      setIgnoredCount((prev) => prev + localIgnoredCount); 
      setShowEmptyWarning(false); 
    } else {
      setIgnoredCount((prev) => prev + localIgnoredCount); 
      setShowEmptyWarning(true); 
    }

    if (fileInputRef.current) fileInputRef.current.value = ""; 
  };

  const handleClearAll = () => {
    setParsedItems([]); 
    setLoadedFiles([]); 
    setIgnoredCount(0); 
    setShowEmptyWarning(false); 
    setShowInvalidFileAlert(false);
    if (fileInputRef.current) fileInputRef.current.value = ""; 
  };

  const handleTryClose = () => {
    if (parsedItems.length > 0) {
      setShowConfirmClose(true); 
    } else {
      executeClose(); 
    }
  };

  const executeClose = () => {
    handleClearAll(); 
    setShowConfirmClose(false); 
    onClose(); 
  };

  const handleSaveAll = async () => {
    setIsSubmitting(true); 
    try {
      await onImportConfirmed(parsedItems); 
      handleClearAll(); 
      onClose(); 
    } catch (error) {
      console.error(error); 
    } finally {
      setIsSubmitting(false); 
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && !isSubmitting && handleTryClose()}>
        <DialogContent className="max-w-7xl bg-white p-6 max-h-[92vh] flex flex-col justify-start rounded-xl shadow-xl border border-slate-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 text-base font-bold">
              <Upload className="h-5 w-5 text-blue-600" />
              Carga Masiva de Combustible
            </DialogTitle>
            <DialogDescription>
              Selecciona archivos CSV o XLSX de carga. El importe total se calculará de manera automática basándose en los litros y el precio unitario ingresados.
            </DialogDescription>
          </DialogHeader>

          {showInvalidFileAlert && (
            <div className="my-2 p-4 rounded-xl border border-red-200 bg-red-50 flex gap-3 items-center animate-in fade-in zoom-in-95 duration-200">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <div className="text-xs text-red-800 font-medium">
                <span className="font-bold uppercase block mb-0.5">Archivo no admitido</span>
                Por favor, sube únicamente archivos en formato <span className="font-bold font-mono">.csv o .xlsx</span>.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 my-2 items-center">
            <div className="md:col-span-6 flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subir Cargas (.csv, .xlsx)</label>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-10 px-3 w-full flex items-center justify-between border border-slate-300 bg-white rounded-lg cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors group"
              >
                <span className="text-xs text-slate-500 font-medium truncate max-w-[300px]">
                  {loadedFiles.length > 0 ? loadedFiles.join(", ") : "-- seleccione archivos --"}
                </span>
                <FileSpreadsheet className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
                multiple
                className="hidden"
              />
            </div>

            <div className="md:col-span-3 flex flex-col gap-2 justify-center items-center">
              {(parsedItems.length > 0 || showEmptyWarning || showInvalidFileAlert) && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={isSubmitting}
                  className="h-8 w-full max-w-[180px] px-3 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 rounded-lg transition-colors uppercase flex items-center justify-center gap-1 border border-slate-200 shadow-sm"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpiar Intentos
                </button>
              )}
            </div>

            <div className="md:col-span-3 text-xs text-slate-600 flex flex-col gap-1 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4 justify-center">
              <div className="font-medium text-slate-700">
                Registros listos: <span className="font-bold text-emerald-600 text-sm">{parsedItems.length}</span>
              </div>
              {ignoredCount > 0 && (
                <div className="text-slate-500 font-medium">
                  Registros omitidos: <span className="font-bold text-amber-600 text-sm">{ignoredCount}</span>
                </div>
              )}
            </div>
          </div>

          {showEmptyWarning && parsedItems.length === 0 && (
            <div className="my-4 p-5 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-col md:flex-row gap-4 items-start animate-in fade-in zoom-in-95 duration-200">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wide">
                  No se encontraron nuevos registros válidos
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  El archivo fue leído con éxito, pero todos los registros fueron omitidos porque ya existen sus folios en la base de datos, no corresponden a un número económico de unidad válido, no cumplen con la progresión del odómetro/vacío o faltan campos obligatorios.
                </p>
              </div>
            </div>
          )}

          {parsedItems.length > 0 && (
            <div className="flex-1 overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col min-h-[300px]">
              <div className="overflow-y-auto max-h-[45vh]">
                <table className="w-full text-left text-xs text-slate-700 relative table-fixed">
                  <thead className="bg-slate-100 text-slate-600 uppercase border-b border-slate-200 sticky top-0 font-semibold z-10 text-[11px]">
                    <tr>
                      <th className="px-3 py-2.5 w-[50px] text-center">#</th>
                      <th className="px-3 py-2.5 w-[110px]">Fecha Carga</th>
                      <th className="px-3 py-2.5 w-[150px]">Gasolinera</th>
                      <th className="px-3 py-2.5 w-[120px]">Folio</th>
                      <th className="px-3 py-2.5 w-[110px]">Unidad</th>
                      <th className="px-3 py-2.5 w-[90px]">Litros</th>
                      <th className="px-3 py-2.5 w-[100px]">P. Litro</th>
                      <th className="px-3 py-2.5 w-[110px]">Importe (Auto)</th>
                      <th className="px-3 py-2.5 w-[110px]">Kms Odo</th>
                      <th className="px-3 py-2.5 w-[110px]">Kms Vacío</th>
                      <th className="px-3 py-2.5 w-[130px]">Referencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {parsedItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 text-center text-slate-400">{index + 1}</td>
                        <td className="px-3 py-2 truncate text-slate-700">{item.fecha_carga}</td>
                        <td className="px-3 py-2 text-slate-500 truncate" title={item.gasolinera || ""}>{item.gasolinera || "---"}</td>
                        <td className="px-3 py-2 truncate font-mono text-slate-800">{item.folio}</td>
                        <td className="px-3 py-2 truncate text-slate-900 font-bold">{item.unidad}</td>
                        <td className="px-3 py-2 text-slate-600">{item.litros.toLocaleString()} L</td>
                        <td className="px-3 py-2 text-slate-600">${item.costo_litro.toFixed(2)}</td>
                        <td className="px-3 py-2 text-emerald-600 font-bold">${item.importe.toFixed(2)}</td>
                        <td className="px-3 py-2 text-slate-600 font-mono">{item.kms_odo.toLocaleString()} km</td>
                        <td className="px-3 py-2 text-slate-600 font-mono">
                          {item.kms_vacio != null ? `${item.kms_vacio.toLocaleString()} km` : "---"}
                        </td>
                        <td className="px-3 py-2 text-slate-500 truncate" title={item.referencia || ""}>{item.referencia || "---"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleTryClose}
              className="h-10 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg uppercase transition-colors"
            >
              Cancelar
            </button>
            {parsedItems.length > 0 && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveAll}
                className="h-10 px-5 text-xs font-semibold text-white rounded-lg uppercase flex items-center gap-1.5 shadow-sm transition-all bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="h-4 w-4" />
                {isSubmitting ? "PROCESANDO..." : `GUARDAR ${parsedItems.length} CARGAS`}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirmClose}
        onOpenChange={(open) => !open && setShowConfirmClose(false)}
        title="¿Descartar importación?"
        description={`Tienes ${parsedItems.length} registros listos en la tabla de previsualización. Al cerrar el modal, estos datos se borrarán por completo.`}
        confirmText="SÍ, DESCARTAR Y SALIR"
        confirmButtonClassName="bg-amber-600 text-white hover:bg-amber-700 font-bold"
        onConfirm={executeClose}
      />
    </>
  );
};