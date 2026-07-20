import { useEffect, useState } from "react";
import { Fuel, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { fuelCargasService } from "../services/fuelCargasService";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import type { 
  FuelCargaItem, 
  CreateFuelCargaPayload, 
  UnidadCatalogo, 
  FuelCargaFormValues 
} from "../types/fuelCargas.types";

interface FuelCargasModalProps {
  open: boolean;
  onClose: () => void;
  editingItem: FuelCargaItem | null;
  onSave: (data: CreateFuelCargaPayload) => Promise<void>;
}

const initialValues: FuelCargaFormValues = {
  fecha_carga: "",
  hora_carga: "",
  gasolinera: "", 
  folio: "",
  id_unidad: "",     
  litros: 0,
  costo_litro: 0,
  importe: 0,
  referencia: "",
  kms_odo: null,  
  kms_vacio: null, 
  grupo_unidades: null, 
  kms_gps: null, 
  porc_vacio: null, 
  rend_gps: null, 
  rend_odo: null, 
  rend_optimo: null
};

export const FuelCargasModal = ({ open, onClose, editingItem, onSave }: FuelCargasModalProps) => {
  const { idEmpresa } = useEmpresaActiva();
  const [formData, setFormData] = useState<FuelCargaFormValues>({ ...initialValues });
  const [unidades, setUnidades] = useState<UnidadCatalogo[]>([]);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && idEmpresa) {
      fuelCargasService.getUnidades(idEmpresa)
        .then((data) => {
          setUnidades(data);
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }, [open, idEmpresa]);

  useEffect(() => {
    setErrorMsg(null);
    if (editingItem) {
      const rawFecha = editingItem.fecha_carga || "";
      let fechaPart = "";
      let horaPart = "12:00";
      
      if (rawFecha.includes("T")) {
        const parts = rawFecha.split("T");
        fechaPart = parts[0];
        horaPart = parts[1] ? parts[1].slice(0, 5) : "12:00";
      } else if (rawFecha.includes(" ")) {
        const parts = rawFecha.split(" ");
        fechaPart = parts[0];
        horaPart = parts[1] ? parts[1].slice(0, 5) : "12:00";
      } else {
        fechaPart = rawFecha;
      }

      setFormData({
        fecha_carga: fechaPart,
        hora_carga: horaPart, 
        gasolinera: editingItem.gasolinera || "",
        folio: editingItem.folio,
        id_unidad: editingItem.id_unidad,
        litros: editingItem.litros,
        costo_litro: editingItem.costo_litro,
        importe: editingItem.importe,
        referencia: editingItem.referencia || "",
        kms_odo: editingItem.kms_odo ?? null,
        kms_vacio: editingItem.kms_vacio ?? null,
        grupo_unidades: editingItem.grupo_unidades ?? null,
        kms_gps: editingItem.kms_gps ?? null,
        porc_vacio: editingItem.porc_vacio ?? null,
        rend_gps: editingItem.rend_gps ?? null,
        rend_odo: editingItem.rend_odo ?? null,
        rend_optimo: editingItem.rend_establecido ?? null,
      });
    } else {
      const ahora = new Date();
      setFormData({ 
        ...initialValues, 
        fecha_carga: ahora.toISOString().split("T")[0],
        hora_carga: ahora.toTimeString().slice(0, 5)
      });
    }
  }, [editingItem, open]);

  useEffect(() => {
    const litros = formData.litros || 0;
    const precio = formData.costo_litro || 0;
    const importeCalculado = Number((litros * precio).toFixed(2));

    if (formData.importe !== importeCalculado) {
      setFormData((prev) => ({ ...prev, importe: importeCalculado }));
    }
  }, [formData.litros, formData.costo_litro]);

  const hasUnsavedChanges = (): boolean => {
    if (editingItem) {
      const originalFecha = editingItem.fecha_carga.split("T")[0];
      return (
        formData.gasolinera !== (editingItem.gasolinera || "") ||
        Number(formData.id_unidad) !== Number(editingItem.id_unidad) ||
        formData.folio !== editingItem.folio ||
        formData.fecha_carga !== originalFecha ||
        (formData.kms_odo ?? null) !== (editingItem.kms_odo ?? null) ||
        (formData.kms_vacio ?? null) !== (editingItem.kms_vacio ?? null) ||
        Number(formData.litros) !== Number(editingItem.litros) ||
        Number(formData.costo_litro) !== Number(editingItem.costo_litro) ||
        formData.referencia !== (editingItem.referencia || "")
      );
    }

    const ahora = new Date();
    const defaultFecha = ahora.toISOString().split("T")[0];

    return (
      formData.gasolinera !== "" ||
      formData.id_unidad !== "" ||
      formData.folio !== "" ||
      formData.fecha_carga !== defaultFecha ||
      formData.kms_odo !== null ||
      formData.kms_vacio !== null ||
      Number(formData.litros) !== 0 ||
      Number(formData.costo_litro) !== 0 ||
      formData.referencia !== ""
    );
  };

  const handleTryClose = () => {
    if (hasUnsavedChanges()) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const idUnidadNumerica = Number(formData.id_unidad);
  const unidadSeleccionada = unidades.find((u) => Number(u.id_unidad) === idUnidadNumerica);
  const odometroFisicoActual = Number(unidadSeleccionada?.odometro_fisico) || 0;
  const kmsRecorridosDeEstaCarga = editingItem ? Number(editingItem.kms_recorridos) : 0;
  const limiteInferior = editingItem 
    ? odometroFisicoActual - kmsRecorridosDeEstaCarga 
    : odometroFisicoActual;

  const kmsRecorridosCalculados = formData.kms_odo 
    ? Math.max(0, Number(formData.kms_odo) - limiteInferior) 
    : 0;

  const porcVacioEstimado = kmsRecorridosCalculados > 0 
    ? ((Number(formData.kms_vacio) || 0) / kmsRecorridosCalculados) * 100 
    : 0;

  const rendimientoOptimo = Number(unidadSeleccionada?.rendimiento_establecido) || 0;

  const todayStr = new Date().toISOString().split("T")[0];
  const nowTimeStr = new Date().toTimeString().slice(0, 5);
  const maxTimeStr = formData.fecha_carga === todayStr ? nowTimeStr : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!idEmpresa) {
      setErrorMsg("No se ha detectado ninguna empresa activa seleccionada.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedFecha = `${formData.fecha_carga} ${formData.hora_carga || "00:00"}:00`;

      const payload: CreateFuelCargaPayload = {
        id_empresa: idEmpresa,
        id_unidad: idUnidadNumerica,
        fecha_carga: formattedFecha,
        gasolinera: formData.gasolinera === "" ? null : formData.gasolinera,
        grupo_unidades: formData.grupo_unidades,
        folio: formData.folio,
        litros: formData.litros,
        costo_litro: formData.costo_litro,
        importe: formData.importe,
        referencia: formData.referencia === "" ? null : formData.referencia,
        kms_odo: formData.kms_odo,
        kms_vacio: formData.kms_vacio,
        kms_gps: formData.kms_gps,
        porc_vacio: porcVacioEstimado,
        rend_gps: formData.rend_gps,
        rend_odo: formData.rend_odo,
        rend_optimo: rendimientoOptimo
      };

      await onSave(payload);
    } catch (error: any) {
      setErrorMsg(error.message || "Ocurrió un error al guardar la carga.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeText = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: keyof FuelCargaFormValues) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleChangeNum = (e: React.ChangeEvent<HTMLInputElement>, field: keyof FuelCargaFormValues) => {
    const val = e.target.value;
    setFormData({ ...formData, [field]: val === "" ? null : Number(val) });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleTryClose()}>
        <DialogContent className="max-w-3xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 text-base font-bold">
              <Fuel className="h-5 w-5 text-blue-600" />
              {editingItem ? "Editar Carga de Combustible" : "Nueva Carga de Combustible"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Formulario para registrar o editar cargas individuales de combustible.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Gasolinera</label>
                <input 
                  type="text"
                  value={formData.gasolinera || ""} 
                  onChange={(e) => handleChangeText(e, 'gasolinera')}
                  className="w-full h-10 rounded-lg border px-3 text-xs outline-none focus:border-blue-500 border-slate-200"
                  placeholder="Ej: Gasolinera Centro"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Unidad *</label>
                <select 
                  required
                  disabled={!!editingItem}
                  value={formData.id_unidad || ""} 
                  onChange={(e) => handleChangeText(e, 'id_unidad')}
                  className="w-full h-10 rounded-lg border px-3 text-xs outline-none focus:border-blue-500 border-slate-200 bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  <option value="">-- seleccione --</option>
                  {unidades.map((u) => (
                    <option key={u.id_unidad} value={u.id_unidad}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
              </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Folio *</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.folio} 
                      onChange={(e) => handleChangeText(e, 'folio')} 
                      className="w-full h-10 rounded-lg border px-3 text-xs outline-none focus:border-blue-500 border-slate-200" 
                      placeholder="Ej: F-12345" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Fecha de Carga *</label>
                    <input 
                      type="date" 
                      required 
                      max={todayStr}
                      value={formData.fecha_carga} 
                      onChange={(e) => handleChangeText(e, 'fecha_carga')} 
                      className="w-full h-10 rounded-lg border px-3 text-xs outline-none focus:border-blue-500 border-slate-200" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Hora de Carga *</label>
                    <input 
                      type="time" 
                      required 
                      max={maxTimeStr}
                      value={formData.hora_carga} 
                      onChange={(e) => handleChangeText(e, 'hora_carga')} 
                      className="w-full h-10 rounded-lg border px-3 text-xs outline-none focus:border-blue-500 border-slate-200" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Odómetro Físico *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required
                      min={limiteInferior}
                      value={formData.kms_odo ?? ""} 
                      onChange={(e) => handleChangeNum(e, 'kms_odo')} 
                      className="w-full h-10 rounded-lg border px-3 text-xs outline-none focus:border-blue-500 border-slate-200" 
                      placeholder={`Ej: 45210 (Mín: ${limiteInferior})`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Kms. de vacío</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      min={0}
                      max={kmsRecorridosCalculados}
                      value={formData.kms_vacio ?? ""} 
                      onChange={(e) => handleChangeNum(e, 'kms_vacio')} 
                      className="w-full h-10 rounded-lg border px-3 text-xs outline-none focus:border-blue-500 border-slate-200" 
                      placeholder={`Ej: 120 (Máximo: ${kmsRecorridosCalculados.toFixed(2)})`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Diferencia de Odómetro</label>
                    <div className="w-full h-8 flex items-center px-3 rounded-lg bg-slate-50 border border-slate-100 text-xs font-medium text-slate-600">
                      {kmsRecorridosCalculados.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">% Vacío Estimado</label>
                    <div className="w-full h-8 flex items-center px-3 rounded-lg bg-slate-50 border border-slate-100 text-xs font-medium text-slate-600">
                      {porcVacioEstimado.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-slate-100 pt-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Litros *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required 
                      min="0.01"
                      max="99999999.99"
                      value={formData.litros || ""} 
                      onChange={(e) => handleChangeNum(e, 'litros')} 
                      className="w-full h-10 rounded-lg border px-3 text-xs outline-none focus:border-blue-500 border-slate-200 bg-white" 
                      placeholder="Máx: 99,999,999.99"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Precio por Litro ($) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required 
                      min="0.01"
                      max="99999999.99"
                      value={formData.costo_litro || ""} 
                      onChange={(e) => handleChangeNum(e, 'costo_litro')} 
                      className="w-full h-10 rounded-lg border px-3 text-xs outline-none focus:border-blue-500 border-slate-200 bg-white" 
                      placeholder="Máx: 99,999,999.99"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1">Importe Total ($) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      disabled 
                      readOnly
                      max="9999999999.99"
                      value={formData.importe || ""} 
                      className="w-full h-10 rounded-lg border px-3 text-xs font-bold outline-none bg-blue-50 border-blue-200 text-blue-700 cursor-not-allowed" 
                      placeholder="Máx: 9,999,999,999.99"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-700 mb-1">Rendimiento Óptimo</label>
                    <input 
                      type="text" 
                      disabled 
                      readOnly
                      value={rendimientoOptimo > 0 ? `${rendimientoOptimo.toFixed(2)} km/L` : "---"} 
                      className="w-full h-10 rounded-lg border px-3 text-xs font-bold outline-none bg-emerald-50 border-emerald-200 text-emerald-700 cursor-not-allowed" 
                      placeholder="No establecido"
                    />
                  </div>
                </div>

                <div className="w-full border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Referencia</label>
                    <input 
                      type="text" 
                      value={formData.referencia || ""} 
                      onChange={(e) => handleChangeText(e, 'referencia')} 
                      className="w-full h-10 rounded-lg border px-3 text-xs outline-none focus:border-blue-500 border-slate-200 bg-white" 
                      placeholder="Ej: REF-1234"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200 mt-4">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span className="font-semibold">{errorMsg}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                  <button type="button" onClick={handleTryClose} disabled={isSubmitting} className="h-10 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg uppercase">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="h-10 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg uppercase">{isSubmitting ? "Guardando..." : "Guardar Registro"}</button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <ConfirmDialog open={showConfirmClose} onOpenChange={(open) => !open && setShowConfirmClose(false)} title="¿Cerrar sin guardar cambios?" description="Si decides salir ahora, perderás la información ingresada." confirmText="DESCARTAR CAMBIOS" confirmButtonClassName="bg-amber-600 text-white" onConfirm={() => { setShowConfirmClose(false); onClose(); }} />
        </>
      );
    };