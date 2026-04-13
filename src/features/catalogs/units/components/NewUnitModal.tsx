import { useEffect, useMemo, useState } from "react"
import { BusFront, RotateCcw, X } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { unitService } from "../services/unitService"
import { catalogService } from "../services/catalogServices"
import type { OperatorOption, UnitGroupOption, AvlModelOption } from "../services/catalogServices"
import { defaultNewUnitForm } from "./new-unit-form.constants"
import { NewUnitGeneralStep } from "./NewUnitGeneralStep"
import { NewUnitAdditionalStep } from "./NewUnitAdditionalStep"
import type { NewUnitModalProps } from "./new-unit-form.types"
import type { CreateUnitPayload } from "../types/unit.types"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"

export const NewUnitModal = ({
  open,
  onOpenChange,
  onCreated,
}: NewUnitModalProps) => {
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<CreateUnitPayload>(defaultNewUnitForm)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [unitGroups, setUnitGroups] = useState<UnitGroupOption[]>([]);
  const [avlModels, setAvlModels] = useState<AvlModelOption[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  useEffect(() => {
    if (!open) return;
    const loadCatalogs = async () => {
      setLoadingCatalogs(true);
      try {
        const [
          ops,
          groups,
          models,
        ] = await Promise.all([
          catalogService.getOperators(),
          catalogService.getUnitGroups(),
          catalogService.getAvlModels(),
        ]);
        setOperators(ops);
        setUnitGroups(groups);
        setAvlModels(models);
      } catch (error) {
        console.error('Error cargando catálogos', error);
      } finally {
        setLoadingCatalogs(false);
      }
    };
    loadCatalogs();
  }, [open]);


  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    if (name === 'id_grupo_unidades') {
      // value viene como string de un input, pero nosotros lo manejamos con el handler personalizado
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGroupSelectionChange = (newSelection: number[]) => {
    setForm(prev => ({ ...prev, id_grupo_unidades: newSelection }));
  };

  const resetFormState = () => {
    setForm(defaultNewUnitForm)
    setStep(1)
    setError("")
  }

  const handleConfirmReset = () => {
    resetFormState()
    setIsResetConfirmOpen(false)
  }

  const handleConfirmClose = () => {
    resetFormState()
    setIsCloseConfirmOpen(false)
    onOpenChange(false)
  }

  const handleImageChange = (imageBase64: string) => {
    setForm(prev => ({ ...prev, imagen: imageBase64 }));
  };

  const generalStepValid = useMemo(() => {
    return Boolean(
      form.numero.trim() &&
      form.marca.trim() &&
      form.modelo.trim() &&
      form.anio.trim() &&
      form.matricula.trim() &&
      form.tipo.trim() &&
      String(form.odometro_inicial).trim() &&
      form.fecha_instalacion.trim() &&
      form.imei.trim() &&
      form.chip.trim()
    );
  }, [form]);

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      setError("")
      // Primer paso de la verificación (ya se ha controlado en la interfaz de usuario, pero se vuelve a comprobar por seguridad)
      if (!generalStepValid) {
        setError("Por favor complete todos los campos requeridos en Datos Generales.");
        setStep(1);
        return;
      }

      const payload = normalizePayload(form);
      await unitService.createUnit(payload as any); // La afirmación de tipo ya cumple con los requisitos del backend

      onCreated()
      resetFormState()
      onOpenChange(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No fue posible crear la unidad"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }
  // Función auxiliar: analiza números de forma segura; devuelve null si la cadena está vacía
  const parseNumberOrNull = (value: string | number | undefined): number | null => {
    if (typeof value === 'number') return value;
    if (!value || value === '') return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  };

  // Normalización payload (sin lanzar excepciones, solo convierte tipos)
  const normalizePayload = (data: CreateUnitPayload) => {
    return {
      // Campos de texto obligatorios (ya validados en generalStepValid)
      numero: data.numero.trim(),
      marca: data.marca.trim(),
      modelo: data.modelo.trim(),
      anio: data.anio.trim(),
      matricula: data.matricula.trim(),
      tipo: data.tipo,
      imei: data.imei.trim(),
      chip: data.chip.trim(),
      fecha_instalacion: data.fecha_instalacion,

      // Campos numéricos
      odometro_inicial: parseNumberOrNull(data.odometro_inicial) ?? 0,
      id_operador: data.id_operador ? Number(data.id_operador) : null,
      id_modelo_avl: data.id_modelo_avl ? Number(data.id_modelo_avl) : null,
      id_grupo_unidades: data.id_grupo_unidades, // ya es array

      // Opcionales con posible vacío → null
      no_serie: data.no_serie?.trim() || null,
      fecha_asignacion_operador: data.fecha_asignacion_operador?.trim() || null,
      tipo_combustible: data.tipo_combustible?.trim() || null,
      capacidad_tanque: parseNumberOrNull(data.capacidad_tanque),
      rendimiento_establecido: parseNumberOrNull(data.rendimiento_establecido),
      nombre_aseguradora: data.nombre_aseguradora?.trim() || null,
      telefono_aseguradora: data.telefono_aseguradora?.trim() || null,
      no_poliza_seguro: data.no_poliza_seguro?.trim() || null,
      vigencia_poliza_seguro: data.vigencia_poliza_seguro?.trim() || null,
      vigencia_verificacion_vehicular: data.vigencia_verificacion_vehicular?.trim() || null,
      temp_min: parseNumberOrNull(data.temp_min) ?? -10,
      temp_max: parseNumberOrNull(data.temp_max) ?? 5,

      // Periféricos
      input1: String(data.input1),
      input2: String(data.input2),
      output1: String(data.output1),
      output2: String(data.output2),

      // Imagen (base64)
      imagen: data.imagen?.trim() || null,
    };
  };



  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="w-[96vw] max-w-[1100px] max-h-[92vh] overflow-hidden rounded-2xl p-0"
        >
          <div className="flex h-full max-h-[92vh] flex-col">
            <DialogHeader className="border-b border-slate-200 px-4 py-4 md:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <DialogTitle className="flex items-center gap-3 text-2xl font-semibold text-slate-700 md:text-3xl">
                  <BusFront className="h-5 w-5 text-slate-400" />
                  Nueva Unidad
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Formulario para registrar una nueva unidad con datos generales y datos adicionales.
                </DialogDescription>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between lg:justify-end">
                  <div className="flex flex-wrap items-center gap-4 text-sm md:gap-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className={
                        step === 1
                          ? "border-b-2 border-slate-700 pb-1 font-semibold text-slate-700"
                          : "pb-1 text-slate-400"
                      }
                    >
                      Datos Generales
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className={
                        step === 2
                          ? "border-b-2 border-slate-700 pb-1 font-semibold text-slate-700"
                          : "pb-1 text-slate-400"
                      }
                    >
                      Datos Adicionales
                    </button>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setIsResetConfirmOpen(true)}
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                      title="Restablecer formulario"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCloseConfirmOpen(true)}
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                      title="Cerrar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
              {step === 1 && (
                <NewUnitGeneralStep
                  form={form}
                  onChange={handleChange}
                  onGroupSelectionChange={handleGroupSelectionChange}  // <-- nueva prop
                  onImageChange={handleImageChange}
                  operators={operators}
                  unitGroups={unitGroups}
                  avlModels={avlModels}
                  loadingCatalogs={loadingCatalogs}
                />
              )}

              {step === 2 && (
                <NewUnitAdditionalStep
                  form={form}
                  onChange={handleChange}
                />
              )}

              {error && <p className="mt-6 text-sm text-rose-500">{error}</p>}
            </div>

            <div className="border-t border-slate-200 px-4 py-4 md:px-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    disabled={step === 1}
                    onClick={() => setStep(1)}
                    className="text-slate-400 disabled:opacity-50"
                  >
                    &lt; Anterior
                  </button>

                  <button
                    type="button"
                    disabled={!generalStepValid}
                    onClick={() => setStep(2)}
                    className="text-slate-600 disabled:opacity-40"
                  >
                    Siguiente &gt;
                  </button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="rounded bg-cyan-500 px-5 py-2 font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
                  >
                    {isLoading ? "Guardando..." : "Guardar"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCloseConfirmOpen(true)}
                    className="rounded border border-slate-300 px-5 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isCloseConfirmOpen}
        onOpenChange={setIsCloseConfirmOpen}
        title="Cerrar formulario"
        description="Al cerrar, perderá la información capturada. ¿Desea cerrar el formulario?"
        confirmText="CERRAR FORMULARIO"
        confirmButtonClassName="bg-amber-400 text-white hover:bg-amber-500"
        onConfirm={handleConfirmClose}
      />

      <ConfirmDialog
        open={isResetConfirmOpen}
        onOpenChange={setIsResetConfirmOpen}
        title="Restablecer formulario"
        description="Al restablecer, se borrará la información capturada en el formulario y para comenzar de nuevo. ¿Desea restablecer el formulario?"
        confirmText="RESTABLECER FORMULARIO"
        confirmButtonClassName="bg-amber-400 text-white hover:bg-amber-500"
        onConfirm={handleConfirmReset}
      />
    </>
  )
}