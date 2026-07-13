import { useState, useEffect } from "react";
import { Users, FolderKanban, Ban, Upload, Download, AlertTriangle } from "lucide-react";
import { AforosTable } from "./AforosTable";
import { AforosEmptyState } from "./AforosEmptyState";
import { AforoModal } from "./AforoModal";
import { BulkUploadModal } from "./BulkUploadModal";
import { BulkExportModal } from "./BulkExportModal"; 
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CatalogLayout, CatalogHeader, useDebounce, usePagination } from "@/components/shared";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { usePermiso } from "@/hooks/usePermiso";
import { GroupsModal } from "./GroupsModal";
import { BlacklistModal } from "./BlacklistModal";
import { aforosService } from "../services/aforoService";
import type { AforoItem, GroupItem, RouteItem } from "../types/aforo.types";
import { notify } from "@/stores/notificationStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const OperatorsAforosView = () => {
  const { idEmpresa, nombreEmpresa } = useEmpresaActiva();

  const puedeCrear = usePermiso("aforos.crear") ?? true;
  const puedeEditar = usePermiso("aforos.editar") ?? true;
  const puedeEliminar = usePermiso("aforos.eliminar") ?? true;

  const [aforos, setAforos] = useState<AforoItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);
  const [itemToBlacklist, setItemToBlacklist] = useState<AforoItem | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false); 
  const [isExportOpen, setIsExportOpen] = useState(false); 
  const [showNoGroupsAlert, setShowNoGroupsAlert] = useState(false);
  const [editingAforo, setEditingAforo] = useState<AforoItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<AforoItem | null>(null);

  const debouncedSearch = useDebounce(search);

  const loadData = async () => {
    if (!idEmpresa) return;
    setLoading(true);
    try {
      const [aforosData, groupsData, routesData] = await Promise.all([
        aforosService.list(debouncedSearch, idEmpresa, null),
        aforosService.listGroups("", idEmpresa),
        aforosService.listRoutes(idEmpresa),
      ]);
      setAforos(Array.isArray(aforosData) ? aforosData : []);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setRoutes(Array.isArray(routesData) ? routesData : []);
    } catch (error) {
      console.error("Error cargando datos:", error);
      showNotification("Error al vincular los catálogos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [idEmpresa, debouncedSearch]);

  const visibleAforos = aforos.filter((item) => !item.is_blacklist);
  const blacklistAforos = aforos.filter((item) => item.is_blacklist);

  const filteredAforos = visibleAforos.filter((item) => {
    const matchesTab = activeTab === "TODOS" || item.id_grupo_aforos === Number(activeTab);
    const matchesSearch =
      (item.clave?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false) ||
      (item.rfid?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false) ||
      (item.departamento?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false) ||
      (item.cliente_ruta?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false) ||
      (item.nombre.toLowerCase().includes(debouncedSearch.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const { paginatedItems } = usePagination(filteredAforos, 10);

  const showNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    if (type === "success") notify.success(message);
    else if (type === "error") notify.error(message);
    else notify.info(message);
  };

  const handleOpenAddAforo = () => {
    if (groups.length === 0) {
      setShowNoGroupsAlert(true);
    } else {
      setEditingAforo(null);
      setIsModalOpen(true);
    }
  };

  const handleSaveAforo = async (formData: Omit<AforoItem, "id_aforo">) => {
    try {
      const payload = { ...formData, id_empresa: idEmpresa };
      if (editingAforo) {
        const updated = await aforosService.update(editingAforo.id_aforo, payload);
        setAforos((prev) => prev.map((a) => (a.id_aforo === updated.id_aforo ? updated : a)));
        showNotification("Aforo actualizado correctamente.");
      } else {
        const created = await aforosService.create(payload);
        setAforos((prev) => [created, ...prev]);
        showNotification("Aforo registrado exitosamente.");
      }
    } catch (error: any) {
      console.error(error);
      showNotification(error.message || "Error al guardar", "error");
    } finally {
      setIsModalOpen(false);
      setEditingAforo(null);
    }
  };

  const handleBulkImportConfirmed = async (items: any[]) => {
    let creadosCount = 0;
    let erroresCount = 0;
    for (const item of items) {
      const matchedGroup = groups.find(
        (g) => g.nombre.toLowerCase() === item.grupo_nombre.toLowerCase() || g.clave?.toLowerCase() === item.grupo_nombre.toLowerCase()
      );

      const existingAforo = aforos.find(
        (a) =>
          (item.rfid && a.rfid === item.rfid) ||
          (item.clave && a.clave === item.clave)
      );

      const payload = {
        id_empresa: idEmpresa,
        id_grupo_aforos: matchedGroup ? matchedGroup.id_grupo_aforos : null,
        rfid: item.rfid || null,
        clave: item.clave || null,
        nombre: item.nombre,
        fecha_asignacion: item.fecha_asignacion || null,
        direccion: item.direccion || null,
        departamento: item.departamento || null,
        referencia: item.referencia || null,
        id_ruta: item.id_ruta ?? null, 
        is_blacklist: false,
      };

      try {
        if (existingAforo) {
          await aforosService.update(existingAforo.id_aforo, payload);
        } else {
          await aforosService.create(payload);
        }
        creadosCount++;
      } catch (err) {
        erroresCount++;
        console.error("Error guardando fila del lote:", err);
      }
    }
    await loadData();
    if (erroresCount > 0) {
      showNotification(
        `Se procesaron ${creadosCount} de ${items.length} aforos. ${erroresCount} registro(s) fallaron; revisa la consola para más detalle.`,
        creadosCount > 0 ? "info" : "error"
      );
    } else {
      showNotification(`Se importaron ${creadosCount} aforos con éxito.`, "success");
    }
  };

  const handleAddToBlacklist = async (item: AforoItem) => {
    try {
      const updated = await aforosService.toggleBlacklist(item.id_aforo, true);
      setAforos((prev) => prev.map((a) => (a.id_aforo === updated.id_aforo ? updated : a)));
      showNotification("Aforo enviado a la lista negra.", "info");
    } catch (error) {
      showNotification("Error al enviar a lista negra", "error");
    } finally {
      setItemToBlacklist(null);
    }
  };

  const handleRemoveFromBlacklist = async (idAforo: number) => {
    try {
      const updated = await aforosService.toggleBlacklist(idAforo, false);
      setAforos((prev) => prev.map((a) => (a.id_aforo === updated.id_aforo ? updated : a)));
      showNotification("Aforo restablecido correctamente.", "success");
    } catch (error) {
      showNotification("Error al quitar de lista negra", "error");
    }
  };

  const handleDelete = async (item: AforoItem) => {
    try {
      await aforosService.delete(item.id_aforo);
      setAforos((prev) => prev.filter((a) => a.id_aforo !== item.id_aforo));
      showNotification("Aforo eliminado correctamente.", "info");
    } catch (error) {
      showNotification("Error al eliminar", "error");
    } finally {
      setItemToDelete(null);
    }
  };

  const handleExportAll = async (fileName: string) => {
    if (visibleAforos.length === 0) {
      showNotification("No hay aforos para exportar.", "error");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Catálogo Activo");
    worksheet.views = [{ showGridLines: true }];

    const fechaConsulta = new Date().toLocaleDateString("es-MX", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });

    worksheet.addRow(["EMPRESA:", nombreEmpresa || "No especificada", "", "", "", "", "FECHA CONSULTA:", fechaConsulta]);
    worksheet.addRow([]);

    worksheet.getRow(1).getCell(1).font = { bold: true };
    worksheet.getRow(1).getCell(7).font = { bold: true };

    const headers = ["RFID(Numerico)", "Grupo", "Clave", "Nombre", "Fecha Asig(Formato YYYY-MM-DD)", "Dirección", "Departamento", "Referencia", "Ruta"];
    const headerRow = worksheet.addRow(headers);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E293B" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    headerRow.height = 24;

    visibleAforos.forEach((item) => {
      const groupObj = groups.find((g) => g.id_grupo_aforos === item.id_grupo_aforos);
      worksheet.addRow([
        item.rfid || "",
        groupObj ? groupObj.nombre : (item.grupo_nombre ?? ""),
        item.clave || "",
        item.nombre || "",
        item.fecha_asignacion || "",
        item.direccion || "",
        item.departamento || "",
        item.referencia || "",
        item.cliente_ruta || "",
      ]);
    });

    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        if (cell.value) {
          const cellLength = cell.value.toString().length;
          if (cellLength > maxLength) maxLength = cellLength;
        }
      });
      column.width = maxLength < 12 ? 12 : maxLength + 4;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const cleanName = fileName.replace(/\.csv$/, "");
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    
    saveAs(blob, `${cleanName}.xlsx`);
  };

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Plantilla Base");
    worksheet.views = [{ showGridLines: true }];

    const headers = [
      "RFID (Obligatorio)", 
      "Clave Grupo (Obligatorio)", 
      "Clave", 
      "Nombre (Obligatorio)", 
      "Fecha Asignacion (YYYY-MM-DD)", 
      "Dirección", 
      "Departamento", 
      "Referencia"
    ];
    
    const headerRow = worksheet.addRow(headers);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E293B" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    headerRow.height = 24;

    worksheet.columns.forEach((column, index) => {
      if (index === 4 || index === 3 || index === 1) {
        column.width = 32; 
      } else {
        column.width = 20; 
      }

      column.numFmt = '@';
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    
    saveAs(blob, "plantilla_base_aforos.xlsx");
  };

  const toolbarExtra = (
    <div className="flex items-center gap-1.5 w-full md:w-auto md:ml-auto justify-end">
      <button
        type="button"
        onClick={() => setIsBlacklistOpen(true)}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors relative border border-slate-100 shadow-sm md:border-none md:shadow-none"
        title={`Ver Lista Negra (${blacklistAforos.length})`}
      >
        <Ban className="h-5 w-5 text-red-500" />
        {blacklistAforos.length > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm">
            {blacklistAforos.length}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => setIsExportOpen(true)} 
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors border border-slate-100 shadow-sm md:border-none md:shadow-none"
        title="Exportación avanzada de aforos"
      >
        <Download className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => setIsBulkOpen(true)}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors border border-slate-100 shadow-sm md:border-none md:shadow-none"
        title="Carga masiva por lote desde CSV"
      >
        <Upload className="h-5 w-5" />
      </button>
    </div>
  );

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse font-medium">Cargando catálogo primario...</div>;
  }

  return (
    <CatalogLayout>
      <CatalogHeader
        icon={Users}
        title="Catálogo de Aforos"
        subtitle={
          visibleAforos.length > 0
            ? `${visibleAforos.length} aforo${visibleAforos.length !== 1 ? "s" : ""} registrado${visibleAforos.length !== 1 ? "s" : ""}`
            : undefined
        }
        search={search}
        onSearchChange={setSearch}
        onAdd={puedeCrear ? handleOpenAddAforo : undefined}
        toolbarExtra={toolbarExtra}
      />

      <div className="border-b border-slate-200 px-4 py-4 md:px-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab("TODOS")}
            className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-colors uppercase ${
              activeTab === "TODOS"
                ? "border-blue-600 bg-blue-50 text-blue-600 font-bold"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Todos <span className={`ml-1 ${activeTab === "TODOS" ? "text-blue-400" : "text-slate-400"}`}>{visibleAforos.length}</span>
          </button>
          {groups.map((g) => {
            const count = aforos.filter(a => !a.is_blacklist && a.id_grupo_aforos === g.id_grupo_aforos).length;
            return (
              <button
                key={g.id_grupo_aforos}
                type="button"
                onClick={() => setActiveTab(String(g.id_grupo_aforos))}
                className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-colors uppercase inline-flex items-center gap-2 ${
                  activeTab === String(g.id_grupo_aforos)
                    ? "border-blue-600 bg-blue-50 text-blue-600 font-bold"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {g.clave && <span className="text-[10px] font-normal text-slate-400">({g.clave})</span>}
                {g.nombre}
                <span className={`ml-0.5 text-[10px] ${activeTab === String(g.id_grupo_aforos) ? "text-blue-400" : "text-slate-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsGroupsOpen(true)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm uppercase"
        >
          <FolderKanban className="h-4 w-4 text-slate-500" />
          Gestionar Grupos
        </button>
      </div>

      <div className="p-4 md:p-6">
        {filteredAforos.length === 0 ? (
          <AforosEmptyState
            search={search}
            onClearSearch={() => setSearch("")}
            puedeCrear={puedeCrear}
            onAddClick={handleOpenAddAforo}
          />
        ) : (
          <AforosTable
            items={paginatedItems}
            canEdit={puedeEditar}
            canDelete={puedeEliminar}
            onEdit={(id) => {
              const item = aforos.find((a) => a.id_aforo === id);
              if (item) {
                setEditingAforo(item);
                setIsModalOpen(true);
              }
            }}
            onDelete={setItemToDelete}
            onBlacklist={(item) => setItemToBlacklist(item)}
          />
        )}
      </div>

      <AforoModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingItem={editingAforo}
        groups={groups}
        routes={routes}
        aforos={aforos}
        onSave={handleSaveAforo}
      />

      <BulkUploadModal
        open={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        groups={groups}
        routes={routes}
        existingAforos={aforos}
        onImportConfirmed={handleBulkImportConfirmed}
      />

      <BulkExportModal
        open={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExportAll={handleExportAll}
        onDownloadTemplate={handleDownloadTemplate}
      />

      <GroupsModal
        open={isGroupsOpen}
        onClose={() => setIsGroupsOpen(false)}
        aforos={aforos}
        groups={groups}
        onUpdateGroups={setGroups}
        onUpdateAforos={(updatedList) => setAforos(updatedList)}
      />

      <BlacklistModal
        open={isBlacklistOpen}
        onClose={() => setIsBlacklistOpen(false)}
        blacklistItems={blacklistAforos}
        onRemove={handleRemoveFromBlacklist}
      />

      <ConfirmDialog
        open={itemToDelete !== null}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        title="Eliminar Aforo"
        description={`¿Estás seguro de eliminar el aforo a "${itemToDelete?.nombre}" con RFID "${itemToDelete?.rfid}"? Esta acción no se puede deshacer.`}
        confirmText="ELIMINAR"
        confirmButtonClassName="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        onConfirm={() => handleDelete(itemToDelete!)}
      />

      <ConfirmDialog
        open={itemToBlacklist !== null}
        onOpenChange={(open) => !open && setItemToBlacklist(null)}
        title="Enviar a Lista Negra"
        description={`¿Estás seguro de enviar a "${itemToBlacklist?.nombre}" a la lista negra? Este aforo dejará de estar activo en los accesos operacionales.`}
        confirmText="BLOQUEAR"
        confirmButtonClassName="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        onConfirm={() => handleAddToBlacklist(itemToBlacklist!)}
      />

      <Dialog open={showNoGroupsAlert} onOpenChange={setShowNoGroupsAlert}>
        <DialogContent className="max-w-md bg-white border-amber-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-800 font-bold text-base">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              Se requiere un Grupo
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2 text-sm">
              No es posible crear un registro de aforo sin antes tener al menos un grupo registrado en el sistema. Los grupos son necesarios para la correcta clasificación y agrupación de tus aforos.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowNoGroupsAlert(false)}
              className="rounded-lg px-4 h-10 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 uppercase transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNoGroupsAlert(false);
                setIsGroupsOpen(true);
              }}
              className="rounded-lg bg-blue-600 px-4 h-10 text-xs font-semibold text-white hover:bg-blue-700 uppercase transition-colors flex items-center gap-1.5 animate-pulse"
            >
              <FolderKanban className="h-4 w-4" />
              Ir a Crear Grupo
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </CatalogLayout>
  );
};