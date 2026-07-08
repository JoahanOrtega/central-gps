import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import type { AforoItem, GroupItem, RouteItem } from "../types/aforo.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface AforoModalProps {
  open: boolean;
  onClose: () => void;
  editingItem: AforoItem | null;
  groups: GroupItem[];
  routes: RouteItem[];
  onSave: (data: Omit<AforoItem, "id_aforo">) => void;
}

const initialValues: Omit<AforoItem, "id_aforo"> = {
  id_empresa: 0,
  id_grupo_aforos: null,
  rfid: "",
  clave: "",
  nombre: "",
  departamento: "",
  direccion: "",
  id_ruta: null,
  referencia: "",
  fecha_asignacion: "",
  is_blacklist: false,
  blacklist_date: null,
  status: 1,
  fecha_registro: null,
};

export const AforoModal = ({
  open,
  onClose,
  editingItem,
  groups,
  routes,
  onSave,
}: AforoModalProps) => {
  const [formData, setFormData] = useState<Omit<AforoItem, "id_aforo">>({ ...initialValues });
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        ...editingItem,
        fecha_asignacion: editingItem.fecha_asignacion
          ? editingItem.fecha_asignacion.split("T")[0]
          : "",
      });
    } else {
      // Obtiene la fecha local de hoy en formato YYYY-MM-DD
      const hoy = new Date().toISOString().split("T")[0];
      setFormData({ 
        ...initialValues,
        fecha_asignacion: hoy 
      });
    }
  }, [editingItem, open]);

  const checkIfDirty = (): boolean => {
    const baseData = editingItem
      ? {
          ...editingItem,
          fecha_asignacion: editingItem.fecha_asignacion ? editingItem.fecha_asignacion.split("T")[0] : "",
        }
      : {
          ...initialValues,
          fecha_asignacion: new Date().toISOString().split("T")[0]
        };

    return (
      (formData.rfid ?? "") !== (baseData.rfid ?? "") ||
      (formData.clave ?? "") !== (baseData.clave ?? "") ||
      formData.nombre !== baseData.nombre ||
      formData.id_grupo_aforos !== baseData.id_grupo_aforos ||
      (formData.fecha_asignacion ?? "") !== (baseData.fecha_asignacion ?? "") ||
      (formData.departamento ?? "") !== (baseData.departamento ?? "") ||
      (formData.direccion ?? "") !== (baseData.direccion ?? "") ||
      (formData.referencia ?? "") !== (baseData.referencia ?? "") ||
      formData.id_ruta !== baseData.id_ruta
    );
  };

  const handleTryClose = () => {
    if (checkIfDirty()) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleTryClose()}>
        <DialogContent className="max-w-4xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 text-base font-bold">
              <Users className="h-5 w-5 text-blue-600" />
              {editingItem ? "Editar Registro de Aforo" : "Nuevo Registro de Aforo"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Código RFID *</label>
                <input
                  type="text"
                  required
                  value={formData.rfid ?? ""}
                  onChange={(e) => {
                    const valor = e.target.value;
                    // Solo permite guardar el estado si son dígitos o cadena vacía
                    if (/^\d*$/.test(valor)) {
                      setFormData({ ...formData, rfid: valor });
                    }
                  }}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
                  placeholder="Ej: 00012345"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Clave Interna</label>
                <input
                  type="text"
                  value={formData.clave ?? ""}
                  onChange={(e) => setFormData({ ...formData, clave: e.target.value || null })}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
                  placeholder="Ej: OP-01"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Grupo Vinculado *</label>
                <select
                  required
                  value={formData.id_grupo_aforos ?? ""}
                  onChange={(e) => setFormData({ ...formData, id_grupo_aforos: e.target.value ? Number(e.target.value) : null })}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">-- Selecciona Grupo --</option>
                  {groups.map((g) => (
                    <option key={g.id_grupo_aforos} value={g.id_grupo_aforos}>
                      {g.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Fecha Asignación *</label>
                <input
                  type="date"
                  required
                  value={formData.fecha_asignacion ?? ""}
                  onChange={(e) => setFormData({ ...formData, fecha_asignacion: e.target.value || null })}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Departamento</label>
                <input
                  type="text"
                  value={formData.departamento ?? ""}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value || null })}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
                  placeholder="Ej: Operaciones"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={formData.direccion ?? ""}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value || null })}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
                  placeholder="Ej: Av. Central #123"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Referencia Visual</label>
                <input
                  type="text"
                  value={formData.referencia ?? ""}
                  onChange={(e) => setFormData({ ...formData, referencia: e.target.value || null })}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500"
                  placeholder="Ej: Portón azul"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Ruta Fija Asignada</label>
                <select
                  value={formData.id_ruta ?? ""}
                  onChange={(e) => setFormData({ ...formData, id_ruta: e.target.value ? Number(e.target.value) : null })}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Sin ruta</option>
                  {routes.map((r) => (
                    <option key={r.id_ruta} value={r.id_ruta}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
              <button
                type="button"
                onClick={handleTryClose}
                className="h-10 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors uppercase"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-10 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors uppercase"
              >
                Guardar Registro
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirmClose}
        onOpenChange={(open) => !open && setShowConfirmClose(false)}
        title="¿Cerrar sin guardar cambios?"
        description="Has realizado modificaciones en el formulario del aforo. Si decides salir ahora, perderás toda la información ingresada."
        confirmText="DESCARTAR CAMBIOS"
        confirmButtonClassName="bg-amber-600 text-white hover:bg-amber-700"
        onConfirm={() => {
          setShowConfirmClose(false);
          onClose();
        }}
      />
    </>
  );
};