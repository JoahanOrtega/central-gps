import { useState, useEffect } from "react";
import { FolderKanban, Plus, Pencil, Trash2, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { aforosService } from "../services/aforoService";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import type { AforoItem, GroupItem, RouteItem, ClientItem } from "../types/aforo.types";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface GroupsModalProps {
  open: boolean;
  onClose: () => void;
  aforos: AforoItem[];
  groups: GroupItem[];
  onUpdateGroups: (updatedGroups: GroupItem[]) => void;
  onUpdateAforos: (updatedAforos: AforoItem[]) => void;
}

export const GroupsModal = ({
  open,
  onClose,
  aforos,
  groups,
  onUpdateGroups,
  onUpdateAforos,
}: GroupsModalProps) => {
  const { idEmpresa } = useEmpresaActiva();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<GroupItem | null>(null);

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);

  const [nombre, setNombre] = useState("");
  const [clave, setClave] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [idCliente, setIdCliente] = useState<string>("");
  const [idRuta, setIdRuta] = useState<string>("");

  const [claveError, setClaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !idEmpresa) return;

    aforosService.listRoutes(idEmpresa)
      .then(setRoutes)
      .catch((err) => console.error("Error al cargar rutas en grupos:", err));

    aforosService.listClients(idEmpresa)
      .then((data) => {
        setClients(data);
      })
      .catch((err) => console.error("Error al cargar clientes en grupos:", err));
  }, [open, idEmpresa]);

  const resetForm = () => {
    setNombre("");
    setClave("");
    setObservaciones("");
    setIdCliente("");
    setIdRuta("");
    setClaveError(null);
    setEditingGroup(null);
    setIsFormOpen(false);
  };

  const checkIfDirty = (): boolean => {
    if (!isFormOpen) return false;

    const baseNombre = editingGroup ? editingGroup.nombre : "";
    const baseClave = editingGroup ? (editingGroup.clave || "") : "";
    const baseObs = editingGroup ? (editingGroup.observaciones || "") : "";
    const baseCliente = editingGroup && editingGroup.id_cliente ? String(editingGroup.id_cliente) : "";
    const baseRuta = editingGroup && editingGroup.id_ruta ? String(editingGroup.id_ruta) : "";

    return (
      nombre !== baseNombre ||
      clave !== baseClave ||
      observaciones !== baseObs ||
      idCliente !== baseCliente ||
      idRuta !== baseRuta
    );
  };

  const handleTryClose = (fromMainModal = false) => {
    if (checkIfDirty()) {
      setShowConfirmClose(true);
    } else {
      if (fromMainModal) {
        onClose();
      } else {
        resetForm();
      }
    }
  };

  const handleOpenEdit = (group: GroupItem) => {
    setEditingGroup(group);
    setNombre(group.nombre);
    setClave(group.clave || "");
    setObservaciones(group.observaciones || "");
    setIdCliente(group.id_cliente ? String(group.id_cliente) : "");
    setIdRuta(group.id_ruta ? String(group.id_ruta) : "");
    setClaveError(null);
    setIsFormOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaveError(null);
    
    if (!nombre.trim() || !clave.trim() || !idCliente) return;

    const claveLimpia = clave.trim();
    const duplicateClave = groups.find(
      (g) => g.clave?.toLowerCase() === claveLimpia.toLowerCase() && g.id_grupo_aforos !== editingGroup?.id_grupo_aforos
    );

    if (duplicateClave) {
      setClaveError("Esta clave ya se encuentra en uso por otro grupo.");
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      clave: claveLimpia,
      observaciones: observaciones.trim() || null,
      id_cliente: Number(idCliente),
      id_ruta: idRuta ? Number(idRuta) : null,
    };

    try {
      if (editingGroup) {
        const res = await aforosService.updateGroup(editingGroup.id_grupo_aforos, payload, idEmpresa);
        const updated = groups.map((g) => (g.id_grupo_aforos === res.id_grupo_aforos ? res : g));
        onUpdateGroups(updated);
      } else {
        const createPayload = { ...payload, id_empresa: idEmpresa };
        const res = await aforosService.createGroup(createPayload);
        onUpdateGroups([res, ...groups]);
      }
      resetForm();
    } catch (err) {
      console.error("Error al guardar el grupo:", err);
    }
  };

  const handleConfirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      await aforosService.deleteGroup(groupToDelete.id_grupo_aforos);
      const updatedGroups = groups.filter((g) => g.id_grupo_aforos !== groupToDelete.id_grupo_aforos);
      onUpdateGroups(updatedGroups);

      const updatedAforos = aforos.map((a) =>
        a.id_grupo_aforos === groupToDelete.id_grupo_aforos ? { ...a, id_grupo_aforos: null, grupo_nombre: null } : a
      );
      onUpdateAforos(updatedAforos);
    } catch (err) {
      console.error("Error al eliminar el grupo:", err);
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
              Gestión de Grupos de Aforos
            </DialogTitle>
            <DialogDescription>
              Administra los grupos asignados a las empresas y configura sus respectivas agrupaciones de rutas y clientes.
            </DialogDescription>
          </DialogHeader>

          {isFormOpen ? (
            <form onSubmit={handleSaveGroup} className="flex flex-col gap-4 py-2">
              <div className="sr-only">
                <DialogDescription>Formulario para ingresar los datos del grupo de aforos.</DialogDescription>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Clave *</label>
                  <input
                    type="text"
                    required
                    value={clave}
                    onChange={(e) => {
                      setClave(e.target.value);
                      setClaveError(null);
                    }}
                    className={`w-full h-10 rounded-lg border px-3 text-sm outline-none transition-colors ${
                      claveError ? "border-red-500 focus:border-red-500 bg-red-50/50" : "border-slate-200 focus:border-blue-500"
                    }`}
                    placeholder="Ej: G-NORTE"
                  />
                  {claveError && <span className="text-[10px] text-red-500 mt-1 block font-semibold">{claveError}</span>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nombre del Grupo *</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Ej: Grupo Norte"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cliente Asignado *</label>
                  <select
                    required
                    value={idCliente}
                    onChange={(e) => setIdCliente(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="" disabled hidden>Selecciona un cliente</option>
                    {clients.map((c) => (
                      <option key={c.id_cliente} value={String(c.id_cliente)}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ruta Asignada</label>
                  <select
                    value={idRuta}
                    onChange={(e) => setIdRuta(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">Sin ruta</option>
                    {routes.map((r) => (
                      <option key={r.id_ruta} value={String(r.id_ruta)}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Observaciones</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full min-h-[70px] rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 resize-none"
                    placeholder="Comentarios adicionales..."
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
                      <th className="px-4 py-3">Clave</th>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Asociación (C/R)</th>
                      <th className="px-4 py-3 text-center">Total Aforos</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groups.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                          <Layers className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No hay grupos en esta empresa
                        </td>
                      </tr>
                    ) : (
                      groups.map((group) => {
                        const clientObj = clients.find(c => Number(c.id_cliente) === Number(group.id_cliente));
                        const routeObj = routes.find(r => Number(r.id_ruta) === Number(group.id_ruta));
                        
                        const totalLinkedAforos = aforos.filter(
                          (a) => Number(a.id_grupo_aforos) === Number(group.id_grupo_aforos)
                        ).length;

                        return (
                          <tr key={group.id_grupo_aforos} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-mono font-medium text-slate-900">{group.clave || "---"}</td>
                            <td className="px-4 py-3 font-medium text-slate-800">{group.nombre}</td>
                            <td className="px-4 py-3 text-slate-500">
                              {group.id_cliente || group.id_ruta ? (
                                <span>
                                  {group.id_cliente ? `Cli: ${clientObj ? clientObj.nombre : group.id_cliente}` : ""}
                                  {group.id_cliente && group.id_ruta ? " | " : ""}
                                  {group.id_ruta ? `Rut: ${routeObj ? routeObj.nombre : group.id_ruta}` : ""}
                                </span>
                              ) : (
                                "---"
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold">
                              <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-md text-[11px] ${
                                totalLinkedAforos > 0 
                                  ? "bg-blue-50 text-blue-700 border border-blue-200" 
                                  : "bg-slate-100 text-slate-500"
                              }`}>
                                {totalLinkedAforos}
                              </span>
                            </td>
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
                                  disabled={totalLinkedAforos > 0}
                                  onClick={() => setGroupToDelete(group)}
                                  title={totalLinkedAforos > 0 ? "No puedes eliminar un grupo con aforos vinculados" : "Eliminar grupo"}
                                  className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
                                    totalLinkedAforos > 0
                                      ? "text-slate-300 bg-slate-50 cursor-not-allowed"
                                      : "text-red-500 hover:text-red-700 hover:bg-red-50"
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
        title="Eliminar Grupo de Aforos"
        description={`¿Estás seguro de que deseas eliminar el grupo de aforos "${groupToDelete?.nombre}"? Esta acción desvinculará los aforos asociados.`}
        confirmText="ELIMINAR"
        confirmButtonClassName="bg-amber-600 text-white hover:bg-amber-700"
        onConfirm={handleConfirmDeleteGroup}
      />
    </>
  );
};