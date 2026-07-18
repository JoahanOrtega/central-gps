import { useState, useEffect } from "react";
import { Fuel, Upload, Download, AlertTriangle } from "lucide-react";
import ExcelJS from "exceljs";
import { FuelCargasTable } from "./FuelCargasTable";
import { FuelCargasEmptyState } from "./FuelCargasEmptyState";
import { FuelCargasModal } from "./FuelCargasModal";
import { FuelCargasBulkUploadModal } from "./FuelCargasBulkUploadModal";
import { FuelCargasBulkExportModal } from "./FuelCargasBulkExportModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CatalogLayout, CatalogHeader, useDebounce, usePagination } from "@/components/shared";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { usePermiso } from "@/hooks/usePermiso";
import { fuelCargasService } from "../services/fuelCargasService";
import type { FuelCargaItem, UnidadCatalogo } from "../types/fuelCargas.types";
import { notify } from "@/stores/notificationStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const FuelCargasView = () => {
  const { idEmpresa } = useEmpresaActiva();
  
  const puedeCrear = usePermiso("combustible.crear") ?? true;
  const puedeEditar = usePermiso("combustible.editar") ?? true;
  const puedeEliminar = usePermiso("combustible.eliminar") ?? true;

  const [cargas, setCargas] = useState<FuelCargaItem[]>([]);
  const [unidades, setUnidades] = useState<UnidadCatalogo[]>([]); 
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false); 
  const [isExportOpen, setIsExportOpen] = useState(false); 
  const [showNoUnitsAlert, setShowNoUnitsAlert] = useState(false); 
  
  const [editingItem, setEditingItem] = useState<FuelCargaItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<FuelCargaItem | null>(null);

  const debouncedSearch = useDebounce(search);

  const loadData = async () => {
    if (!idEmpresa) return;
    setLoading(true);
    try {
      const [data, unitsData] = await Promise.all([
        fuelCargasService.list(debouncedSearch, idEmpresa),
        fuelCargasService.getUnidades(idEmpresa)
      ]);
      setCargas(Array.isArray(data) ? data : []);
      setUnidades(Array.isArray(unitsData) ? unitsData : []);
    } catch (error) {
      console.error(error);
      notify.error("Error al obtener las cargas de combustible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [idEmpresa, debouncedSearch]);

  const { paginatedItems } = usePagination(cargas, 14);

  const handleOpenAdd = () => {
    if (unidades.length === 0) {
      setShowNoUnitsAlert(true); 
    } else {
      setEditingItem(null);
      setIsModalOpen(true);
    }
  };

  const handleSave = async (formData: any) => {
    try {
      if (editingItem) {
        await fuelCargasService.update(editingItem.id_combustible, formData);
        notify.success("Carga actualizada correctamente.");
      } else {
        await fuelCargasService.create({ ...formData, id_empresa: idEmpresa });
        notify.success("Carga registrada exitosamente.");
      }
      await loadData();
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error: any) {
      notify.error(error.message || "Error al guardar el registro.");
    }
  };

  const handleBulkImportConfirmed = async (items: any[]) => {
    if (!idEmpresa) return;
    try {
      const res = await fuelCargasService.bulkImport(idEmpresa, items);
      
      if (res.omitidos && res.omitidos.length > 0) {
        notify.info(
          `Se procesaron ${res.exitosos} cargas con éxito. ${res.omitidos.length} registros omitidos debido a inconsistencias.`
        );
        console.warn("Registros omitidos durante la importación masiva:", res.omitidos);
      } else {
        notify.success(`Se importaron las ${res.exitosos} cargas exitosamente.`);
      }
      
      await loadData();
      setIsBulkOpen(false);
    } catch (error: any) {
      console.error(error);
      notify.error(error.message || "Ocurrió un problema de comunicación al realizar la carga masiva.");
    }
  };

  const handleDelete = async (item: FuelCargaItem) => {
    try {
      await fuelCargasService.delete(item.id_combustible);
      notify.info("Registro eliminado con éxito.");
      await loadData();
    } catch (error) {
      notify.error("Error al intentar eliminar el registro.");
    } finally {
      setItemToDelete(null);
    }
  };

  const formatExcelFecha = (fechaStr: string) => {
    if (!fechaStr) return "";
    try {
      const dateObj = new Date(fechaStr);
      if (isNaN(dateObj.getTime())) return fechaStr;
      return dateObj.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }) + " " + dateObj.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    } catch {
      return fechaStr;
    }
  };

  const generateExcel = async (data: FuelCargaItem[], fileName: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Cargas");

    worksheet.columns = [
      { key: "empty", width: 5 },
      { key: "index", width: 8 },
      { key: "fecha_carga", width: 22 },
      { key: "operador", width: 20 },
      { key: "gasolinera", width: 30 },
      { key: "grupo_unidades", width: 20 },
      { key: "folio", width: 15 },
      { key: "unidad", width: 10 },
      { key: "litros", width: 12 },
      { key: "costo_litro", width: 15 },
      { key: "importe", width: 15 },
      { key: "kms_gps", width: 12 },
      { key: "kms_vacio", width: 12 },
      { key: "porc_vacio", width: 12 },
      { key: "rend_gps", width: 12 },
      { key: "kms_odo", width: 15 },
      { key: "rend_odo", width: 12 },
    ];

    const fechaActual = new Date().toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
    
    worksheet.addRow([]); 
    worksheet.addRow(["", "Fecha de Consulta", fechaActual]);    
    worksheet.addRow([]); 

    const headerRow = worksheet.addRow([
      "",
      "#", "Fecha Carga", "Operador", "Gasolinera", "Grupo de Unidades", 
      "Folio", "Unidad", "Litros", "Precio x Litro", "Importe", 
      "Kms GPS", "Kms Vacío", "Porc. Vacío", "Rend GPS", "Kms Odo.", "Rend Odo."
    ]);
    
    headerRow.eachCell((cell, colNumber) => {
      if (colNumber > 1) {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } };
      }
    });

    let sumLitros = 0, sumImporte = 0, sumKmsGps = 0, sumKmsVacio = 0, sumKmsOdo = 0;

    data.forEach((item, index) => {
      const litros = Number(item.litros) || 0;
      const kmsGps = Number(item.kms_gps) || 0;
      const kmsVacio = Number(item.kms_vacio) || 0;
      const kmsOdo = Number(item.kms_odo) || 0;
      const costoLitro = Number(item.costo_litro) || 0;
      const importe = Number(item.importe) || 0;

      const porcVacio = kmsGps > 0 ? (kmsVacio / kmsGps) * 100 : 0;
      const rendGps = litros > 0 ? kmsGps / litros : 0;
      const rendOdo = litros > 0 ? kmsOdo / litros : 0;

      sumLitros += litros;
      sumImporte += importe;
      sumKmsGps += kmsGps;
      sumKmsVacio += kmsVacio;
      sumKmsOdo += kmsOdo;

      worksheet.addRow([
        "",
        index + 1,
        formatExcelFecha(item.fecha_carga), 
        (item as any).operador || "", 
        item.gasolinera,
        item.grupo_unidades,
        item.folio,
        item.unidad,
        litros,
        costoLitro,
        importe,
        kmsGps,
        kmsVacio,
        porcVacio,
        rendGps,
        kmsOdo,
        rendOdo
      ]);
    });

    const promCostoLitro = sumLitros > 0 ? sumImporte / sumLitros : 0;
    const promPorcVacio = sumKmsGps > 0 ? (sumKmsVacio / sumKmsGps) * 100 : 0;
    const promRendGps = sumLitros > 0 ? sumKmsGps / sumLitros : 0;
    const promRendOdo = sumLitros > 0 ? sumKmsOdo / sumLitros : 0;

    const totalsRow = worksheet.addRow([
      "",
      "", "", "", "", "", "Totales y Promedios", "", 
      sumLitros, 
      promCostoLitro, 
      sumImporte, 
      sumKmsGps, 
      sumKmsVacio, 
      promPorcVacio, 
      promRendGps, 
      sumKmsOdo, 
      promRendOdo
    ]);
    
    totalsRow.eachCell((cell, colNumber) => {
      if (colNumber > 1) {
        cell.font = { bold: true, color: { argb: "FF0F172A" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      }
    });

    worksheet.columns.forEach((column, colIndex) => {
      if (colIndex === 0) {
        column.width = 5;
        return;
      }
      let maxLen = 0;
      column.eachCell?.({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber > 3) {
          const val = cell.value;
          if (val != null) {
            const len = val.toString().length;
            if (len > maxLen) {
              maxLen = len;
            }
          }
        }
      });
      column.width = Math.max(maxLen + 4, 12);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Plantilla");

    worksheet.columns = [
      { header: "FECHA (ISO YYYY-MM-DD)", key: "fecha_carga", width: 25 },
      { header: "HORA (ISO HH:MM)", key: "hora_carga", width: 20 },
      { header: "GASOLINERA (CLAVE)", key: "gasolinera", width: 25 },
      { header: "FOLIO TICKET", key: "folio", width: 15 },
      { header: "UNIDAD (NUMERO ECONOMICO)", key: "unidad", width: 30 },
      { header: "LITROS", key: "litros", width: 12 },
      { header: "PRECIO LITRO", key: "costo_litro", width: 15 },
      { header: "KMS. FINAL (ODOMETRO)", key: "kms_odo", width: 25 },
      { header: "KMS. VACIO", key: "kms_vacio", width: 15 },
      { header: "REFERENCIA", key: "referencia", width: 20 },
    ];

    worksheet.columns.forEach((col) => {
      col.numFmt = "@";
    });

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla_cargas.xlsx";
    link.click();
    URL.revokeObjectURL(url);
    
    notify.success("Plantilla descargada");
  };

  const handleExportAll = async (fileName: string) => {
    await generateExcel(cargas, fileName);
    notify.success("Archivo exportado correctamente");
  };

  const handleOpenBulkImport = () => {
    if (unidades.length === 0) {
      setShowNoUnitsAlert(true); 
    } else {
      setIsBulkOpen(true);
    }
  };

  const toolbarExtra = (
    <div className="flex items-center gap-1.5 w-full md:w-auto md:ml-auto justify-end">
      <button
        type="button"
        onClick={() => setIsExportOpen(true)} 
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors border border-slate-100 shadow-sm md:border-none md:shadow-none"
        title="Exportación avanzada"
      >
        <Download className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={handleOpenBulkImport}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors border border-slate-100 shadow-sm md:border-none md:shadow-none"
        title="Carga masiva por lote"
      >
        <Upload className="h-5 w-5" />
      </button>
    </div>
  );

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse font-medium">Cargando combustible...</div>;

  return (
    <CatalogLayout>
      <CatalogHeader
        icon={Fuel}
        title="Catálogo Cargas de Combustible"
        subtitle={`${cargas.length} registros encontrados`}
        search={search}
        onSearchChange={setSearch}
        onAdd={puedeCrear ? handleOpenAdd : undefined}
        toolbarExtra={toolbarExtra}
      />

      <div className="w-full flex flex-col min-h-0 h-[calc(100vh-255px)] max-h-[calc(100vh-255px)] px-4 py-2 md:px-6 md:py-3 overflow-hidden">
        {cargas.length === 0 ? (
          <FuelCargasEmptyState search={search} onClearSearch={() => setSearch("")} puedeCrear={puedeCrear} onAddClick={handleOpenAdd} />
        ) : (
          <FuelCargasTable items={paginatedItems} canEdit={puedeEditar} canDelete={puedeEliminar} onEdit={(id) => { const item = cargas.find((c) => c.id_combustible === id); if (item) { setEditingItem(item); setIsModalOpen(true); } }} onDelete={setItemToDelete} />
        )}
      </div>

      <FuelCargasModal open={isModalOpen} onClose={() => setIsModalOpen(false)} editingItem={editingItem} onSave={handleSave} />
      
      <FuelCargasBulkUploadModal 
        open={isBulkOpen} 
        onClose={() => setIsBulkOpen(false)} 
        unidades={unidades}
        existingCargas={cargas}
        onImportConfirmed={handleBulkImportConfirmed} 
      />
      
      <FuelCargasBulkExportModal 
        open={isExportOpen} 
        onClose={() => setIsExportOpen(false)} 
        onExportAll={handleExportAll} 
        onDownloadTemplate={handleDownloadTemplate} 
      />

      <ConfirmDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)} title="Eliminar Registro" description={`¿Estás seguro de eliminar el folio "${itemToDelete?.folio}"?`} confirmText="ELIMINAR" confirmButtonClassName="bg-red-600 text-white" onConfirm={() => handleDelete(itemToDelete!)} />

      <Dialog open={showNoUnitsAlert} onOpenChange={setShowNoUnitsAlert}>
        <DialogContent className="max-w-md bg-white border-amber-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-800 font-bold text-base">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              Se requiere una Unidad en Catálogo
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2 text-sm">
              No es posible registrar cargas de combustible ni realizar cargas masivas si no cuentas con al menos una unidad de transporte registrada en tu catálogo. Las unidades son esenciales para referenciar y calcular las variaciones en los odómetros de tus cargas.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowNoUnitsAlert(false)}
              className="rounded-lg px-4 h-10 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 uppercase transition-colors"
            >
              Cerrar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </CatalogLayout>
  );
};