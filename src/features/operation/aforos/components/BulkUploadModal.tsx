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
import type { GroupItem, AforoItem, RouteItem } from "../types/aforo.types"; 
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva"; 
import ExcelJS from "exceljs";

interface BulkUploadModalProps {
  open: boolean;
  onClose: () => void;
  groups: GroupItem[];
  routes: RouteItem[]; 
  existingAforos: AforoItem[];
  onImportConfirmed: (items: any[]) => Promise<void>;
} 

interface PrevisualizacionAforo {
  id_empresa: number;
  id_grupo_aforos: number;
  grupo_nombre: string;     
  rfid: string;
  clave: string;
  nombre: string;
  fecha_asignacion: string;
  direccion: string;
  departamento: string;
  referencia: string;
  id_ruta: number | null; 
  ruta_nombre?: string;   
  archivo_origen: string;
} 

export const BulkUploadModal = ({
  open,
  onClose,
  groups, 
  existingAforos,
  onImportConfirmed,
}: BulkUploadModalProps) => {
  const { idEmpresa } = useEmpresaActiva(); 
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const [parsedItems, setParsedItems] = useState<PrevisualizacionAforo[]>([]); 
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
    let newItemsThisEvent: PrevisualizacionAforo[] = []; 
    let localIgnoredCount = 0; 

    setShowEmptyWarning(false); 
    setShowInvalidFileAlert(false);

    const existingRfids = new Set(existingAforos.map(a => a.rfid?.trim().toLowerCase()).filter(Boolean));
    const existingClaves = new Set(existingAforos.map(a => a.clave?.trim().toLowerCase()).filter(Boolean));
    
    const localRfids = new Set(localAccumulated.map(a => a.rfid?.trim().toLowerCase()).filter(Boolean));
    const localClaves = new Set(localAccumulated.map(a => a.clave?.trim().toLowerCase()).filter(Boolean));

    const groupsMap = new Map();
    groups.forEach(g => {
      groupsMap.set(g.nombre.toLowerCase(), g);
      if (g.clave) groupsMap.set(g.clave.toLowerCase(), g);
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
                  if (cell.type === ExcelJS.ValueType.Date && cell.value instanceof Date) {
                    const d = cell.value;
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  }
                  return cell.text?.trim() || "";
                };
                
                rowsData.push([
                  getVal(1), getVal(2), getVal(3), getVal(4), getVal(5), 
                  getVal(6), getVal(7), getVal(8)
                ]);
              }
            });
          }
        }

        if (rowsData.length === 0) {
          localIgnoredCount++; 
          continue; 
        }

        const fileItems: PrevisualizacionAforo[] = []; 

        for (const values of rowsData) { 
          const rfid = values[0] || ""; 
          const grupo_nombre = values[1] || ""; 
          const clave = values[2] || ""; 
          const nombre = values[3] || ""; 
          const fecha_asignacion = values[4] || ""; 
          const direccion = values[5] || ""; 
          const departamento = values[6] || ""; 
          const referencia = values[7] || ""; 

          if (!rfid || !nombre || !grupo_nombre) {
            localIgnoredCount++; 
            continue;  
          }

          const grupoEncontrado = groupsMap.get(grupo_nombre.toLowerCase()); 
          
          if (!grupoEncontrado) {
            localIgnoredCount++; 
            continue; 
          }

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

          if (!fecha_asignacion || !esFechaValida(fecha_asignacion)) {
            localIgnoredCount++; 
            continue; 
          }

          const rfidBuscado = rfid.trim().toLowerCase();
          const claveBuscada = clave.trim().toLowerCase();

          const yaExisteEnBD = existingRfids.has(rfidBuscado) || (claveBuscada && existingClaves.has(claveBuscada));
          const existeEnMemoriaLocal = localRfids.has(rfidBuscado) || (claveBuscada && localClaves.has(claveBuscada));

          if (yaExisteEnBD || existeEnMemoriaLocal) {
            localIgnoredCount++; 
            continue;  
          }

          const nuevoItem: PrevisualizacionAforo = {
            id_empresa: idEmpresa || 0, 
            id_grupo_aforos: grupoEncontrado.id_grupo_aforos, 
            grupo_nombre, 
            rfid: rfid.trim(), 
            clave: clave.trim() || "", 
            nombre, 
            fecha_asignacion, 
            direccion: direccion || "", 
            departamento: departamento || "", 
            referencia: referencia || "", 
            id_ruta: null, 
            ruta_nombre: "---", 
            archivo_origen: file.name,
          };

          localRfids.add(rfidBuscado);
          if (claveBuscada) localClaves.add(claveBuscada);

          fileItems.push(nuevoItem); 
          localAccumulated.push(nuevoItem); 
        }

        newItemsThisEvent = [...newItemsThisEvent, ...fileItems]; 
        newLoadedFiles.push(file.name); 
      } catch (err) {
        console.error("Error procesando el archivo:", err); 
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
      console.error("Error al guardar:", error); 
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
              Carga Masiva de Aforos
            </DialogTitle>
            <DialogDescription>
              Selecciona archivos CSV o XLSX. Solo se cargarán los registros 100% válidos (sin duplicados, con grupo existente y datos obligatorios).
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
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subir Plantilla (.csv, .xlsx)</label>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-10 px-3 w-full flex items-center justify-between border border-slate-300 bg-white rounded-lg cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors group"
              >
                <span className="text-xs text-slate-500 font-medium truncate max-w-[300px]">
                  {loadedFiles.length > 0 ? loadedFiles.join(", ") : "-- seleccione la plantilla --"}
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
                  El archivo fue leído con éxito, pero todos los registros fueron omitidos porque ya existen en la base de datos, no cumplen con los requisitos de validación o son duplicados dentro del mismo archivo.
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
                      <th className="px-3 py-2.5 w-[140px]">RFID</th>
                      <th className="px-3 py-2.5 w-[120px]">Grupo</th>
                      <th className="px-3 py-2.5 w-[120px]">Clave</th>
                      <th className="px-3 py-2.5 w-[180px]">Nombre</th>
                      <th className="px-3 py-2.5 w-[110px]">Fecha Asig.</th>
                      <th className="px-3 py-2.5 w-[150px]">Dirección</th>
                      <th className="px-3 py-2.5 w-[120px]">Departamento</th>
                      <th className="px-3 py-2.5 w-[120px]">Referencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {parsedItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 text-center text-slate-400">{index + 1}</td>
                        <td className="px-3 py-2 truncate font-mono text-slate-800">{item.rfid}</td>
                        <td className="px-3 py-2 truncate text-slate-800">{item.grupo_nombre}</td>
                        <td className="px-3 py-2 text-slate-600 truncate">{item.clave || "---"}</td>
                        <td className="px-3 py-2 text-slate-900 truncate">{item.nombre}</td>
                        <td className="px-3 py-2 text-slate-700 truncate">{item.fecha_asignacion}</td>
                        <td className="px-3 py-2 text-slate-500 truncate" title={item.direccion}>{item.direccion || "---"}</td>
                        <td className="px-3 py-2 text-slate-500 truncate" title={item.departamento}>{item.departamento || "---"}</td>
                        <td className="px-3 py-2 text-slate-500 truncate" title={item.referencia}>{item.referencia || "---"}</td>
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
                {isSubmitting ? "PROCESANDO..." : `GUARDAR ${parsedItems.length} REGISTROS`}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirmClose}
        onOpenChange={(open) => !open && setShowConfirmClose(false)}
        title="¿Descartar importación?"
        description={`Tienes ${parsedItems.length} registros listos en la tabla de previsualización. Al cerrar el modal, estos datos se borrarán por completo y perderás el progreso.`}
        confirmText="SÍ, DESCARTAR Y SALIR"
        confirmButtonClassName="bg-amber-600 text-white hover:bg-amber-700 font-bold"
        onConfirm={executeClose}
      />
    </>
  );
};