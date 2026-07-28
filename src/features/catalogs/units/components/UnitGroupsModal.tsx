import { useState, useEffect } from "react";
import { FolderKanban, Plus, Pencil, Trash2, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { unitService } from "../services/unitService";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import type { UnitItem } from "../types/unit.types";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface UnitGroupsModalProps {
  open: boolean;
  onClose: () => void;
  units: UnitItem[];
  groups: any[];
  onUpdateGroups: (updatedGroups: any[]) => void;
  onUpdateUnits: (updatedUnits: UnitItem[]) => void;
}

export const UnitGroupsModal = ({
  open,
  onClose,
  units,
  groups,
  onUpdateGroups,
  onUpdateUnits,
}: UnitGroupsModalProps) => {
  const { idEmpresa } = useEmpresaActiva();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<any | null>(null);

  const [clients, setClients] = useState<any[]>([]);
  const [pois, setPois] = useState<any[]>([]);

  const [nombre, setNombre] = useState("");
  const [idCliente, setIdCliente] = useState<string>("");
  const [idPoi, setIdPoi] = useState<string>("");
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    if (!open || !idEmpresa) return;

    if ((unitService as any).listClients) {
      (unitService as any).listClients(idEmpresa).then(setClients).catch(console.error);
    }
    if ((unitService as any).listPois) {
      (unitService as any).listPois(idEmpresa).then(setPois).catch(console.error);
    }
  }, [open, idEmpresa]);

  const resetForm = () => {
    setNombre("");
    setIdCliente("");
    setIdPoi("");
    setObservaciones("");
    setEditingGroup(null);
    setIsFormOpen(false);
  };

  const checkIfDirty = (): boolean => {
    if (!isFormOpen) return false;
    const baseNombre = editingGroup ? editingGroup.nombre : "";
    const baseCliente = editingGroup && editingGroup.id_cliente ? String(editingGroup.id_cliente) : "";
    const basePoi = editingGroup && editingGroup.id_poi ? String(editingGroup.id_poi) : "";
    const baseObs = editingGroup ? (editingGroup.observaciones || "") : "";
    return nombre !== baseNombre || idCliente !== baseCliente || idPoi !== basePoi || observaciones !== baseObs;
  };

  const handleTryClose = (fromMainModal = false) => {
    if (checkIfDirty()) {
      setShowConfirmClose(true);
    } else {
      if (fromMainModal) onClose(); else resetForm();
    }
  };

  const handleOpenEdit = (group: any) => {
    setEditingGroup(group);
    setNombre(group.nombre);
    setIdCliente(group.id_cliente ? String(group.id_cliente) : "");
    setIdPoi(group.id_poi ? String(group.id_poi) : "");
    setObservaciones(group.observaciones || "");
    setIsFormOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    const payload = {
      nombre: nombre.trim(),
      id_cliente: idCliente ? Number(idCliente) : null,
      id_poi: idPoi ? Number(idPoi) : null,
      observaciones: observaciones.trim() || null,
    };

    try {
      if (editingGroup) {
        const res = await (unitService as any).updateGroup(editingGroup.id_grupo_unidades, payload, idEmpresa);
        const updated = groups.map((g) => (g.id_grupo_unidades === res.id_grupo_unidades ? res : g));
        onUpdateGroups(updated);
      } else {
        const createPayload = { ...payload, id_empresa: idEmpresa };
        const res = await (unitService as any).createGroup(createPayload);
        onUpdateGroups([res, ...groups]);
      }
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      await (unitService as any).deleteGroup(groupToDelete.id_grupo_unidades, idEmpresa);
      const updatedGroups = groups.filter((g) => g.id_grupo_unidades !== groupToDelete.id_grupo_unidades);
      onUpdateGroups(updatedGroups);

      const updatedUnits = units.map((u) => {
        if (!u.id_grupo_unidades) return u;

        if (Array.isArray(u.id_grupo_unidades)) {
          return {
            ...u,
            id_grupo_unidades: u.id_grupo_unidades.filter(
              (id) => Number(id) !== Number(groupToDelete.id_grupo_unidades)
            )
          };
        }

        if (Number(u.id_grupo_unidades) === Number(groupToDelete.id_grupo_unidades)) {
          return { ...u, id_grupo_unidades: undefined };
        }

        return u;
      });
      onUpdateUnits(updatedUnits);
    } catch (err) {
      console.error(err);
    } finally {
      setGroupToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleTryClose(true)}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <FolderKanban className="h-5 w-5" />
              Gestión de Grupos de Unidades
            </DialogTitle>
            <DialogDescription>
              Administra los grupos de tu flota vehicular, vinculándolos a clientes y puntos de interés.
            </DialogDescription>
          </DialogHeader>

          {isFormOpen ? (
            <form onSubmit={handleSaveGroup} className="flex flex-col gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Ej: Grupo Flota Norte"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Asignar Grupo a un Cliente</label>
                  <select
                    value={idCliente}
                    onChange={(e) => setIdCliente(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">Selecciona un cliente (Opcional)</option>
                    {clients.map((c) => (
                      <option key={c.id_cliente} value={String(c.id_cliente)}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Vincular a un punto de interés</label>
                  <select
                    value={idPoi}
                    onChange={(e) => setIdPoi(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">Selecciona un punto de interés (Opcional)</option>
                    {pois.map((p) => (
                      <option key={p.id_poi} value={String(p.id_poi)}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Observaciones</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full min-h-[70px] rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 resize-none"
                    placeholder="Comentarios o notas adicionales..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleTryClose(false)}
                  className="h-9 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors uppercase"
                >
                  {editingGroup ? "Guardar Cambios" : "Crear Grupo"}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-medium text-slate-500">
                  {groups.length} {groups.length === 1 ? "grupo registrado" : "grupos registrados"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(true)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  NUEVO GRUPO
                </button>
              </div>

              <div className="flex-1 overflow-y-auto border border-slate-100 rounded-lg">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 uppercase text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 w-12">#</th>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Cliente Asignado</th>
                      <th className="px-4 py-3">Punto de Interés</th>
                      <th className="px-4 py-3 text-center">Unidades</th>
                      <th className="px-4 py-3">Observaciones</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groups.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-medium">
                          <Layers className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No hay grupos en esta empresa
                        </td>
                      </tr>
                    ) : (
                      groups.map((group, index) => {
                        const clientObj = clients.find(c => Number(c.id_cliente) === Number(group.id_cliente));
                        const poiObj = pois.find(p => Number(p.id_poi) === Number(group.id_poi));
                        
                        const totalLinkedUnits = units.filter((u) => {
                          if (!u.id_grupo_unidades) return false;
                          if (Array.isArray(u.id_grupo_unidades)) {
                            return u.id_grupo_unidades.includes(Number(group.id_grupo_unidades));
                          }
                          return Number(u.id_grupo_unidades) === Number(group.id_grupo_unidades);
                        }).length;

                        return (
                          <tr key={group.id_grupo_unidades} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-slate-400">{index + 1}</td>
                            <td className="px-4 py-3 font-medium text-slate-800">{group.nombre}</td>
                            <td className="px-4 py-3 text-slate-600">{clientObj ? clientObj.nombre : "---"}</td>
                            <td className="px-4 py-3 text-slate-600">{poiObj ? poiObj.nombre : "---"}</td>
                            <td className="px-4 py-3 text-center font-semibold">
                              <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-md text-[11px] ${
                                totalLinkedUnits > 0 ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-500"
                              }`}>
                                {totalLinkedUnits}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{group.observaciones || "---"}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(group)}
                                  className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md flex items-center justify-center transition-colors"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={totalLinkedUnits > 0}
                                  onClick={() => setGroupToDelete(group)}
                                  className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
                                    totalLinkedUnits > 0 ? "text-slate-300 bg-slate-50 cursor-not-allowed" : "text-red-500 hover:text-red-700 hover:bg-red-50"
                                  }`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-4 mt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors uppercase"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirmClose}
        onOpenChange={(open) => !open && setShowConfirmClose(false)}
        title="¿Cerrar sin guardar cambios?"
        description="Has realizado modificaciones en el formulario del grupo. Si decides salir ahora, perderás toda la información ingresada."
        confirmText="DESCARTAR CAMBIOS"
        confirmButtonClassName="bg-red-600 text-white hover:bg-red-700"
        onConfirm={() => {
          setShowConfirmClose(false);
          resetForm();
        }}
      />

      <ConfirmDialog
        open={groupToDelete !== null}
        onOpenChange={(open) => !open && setGroupToDelete(null)}
        title="Eliminar Grupo de Unidades"
        description={`¿Estás seguro de que deseas eliminar el grupo "${groupToDelete?.nombre}"? Esta acción desvinculará las unidades asociadas.`}
        confirmText="ELIMINAR"
        confirmButtonClassName="bg-amber-600 text-white hover:bg-amber-700"
        onConfirm={handleConfirmDeleteGroup}
      />
    </>
  );
};