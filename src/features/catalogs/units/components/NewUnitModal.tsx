import { useEffect, useMemo, useState } from "react";
import { BusFront, RotateCcw, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { unitService } from "../services/unitService";
import { catalogService } from "../services/catalogServices";
import type { OperatorOption, UnitGroupOption, AvlModelOption } from "../services/catalogServices";
import { defaultNewUnitForm } from "./new-unit-form.constants";
import { NewUnitGeneralStep } from "./NewUnitGeneralStep";
import { NewUnitAdditionalStep } from "./NewUnitAdditionalStep";
import type { NewUnitModalProps, FieldError } from "./new-unit-form.types";
import type { CreateUnitPayload } from "../types/unit.types";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { notify } from "@/stores/notificationStore";
import { handleError } from "@/lib/handle-error";

const REQUIRED_FIELDS: (keyof CreateUnitPayload)[] = [
  "numero",
  "marca",
  "tipo",
  "odometro_inicial",
  "fecha_instalacion",
  "imei",
  "chip",
];

export const NewUnitModal = ({
  open,
  onOpenChange,
  onCreated,
}: NewUnitModalProps) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<CreateUnitPayload>(defaultNewUnitForm);
  const [errors, setErrors] = useState<Record<string, FieldError>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [unitGroups, setUnitGroups] = useState<UnitGroupOption[]>([]);
  const [avlModels, setAvlModels] = useState<AvlModelOption[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  const { idEmpresa } = useEmpresaActiva();

  useEffect(() => {
    if (!open || !idEmpresa) return;

    // AbortController cancela las peticiones si el efecto se re-ejecuta
    // antes de que terminen (React StrictMode monta dos veces en desarrollo,
    // lo que sin este cancelador agota el pool de conexiones del backend)
    const controller = new AbortController();

    const loadCatalogs = async () => {
      setLoadingCatalogs(true);
      try {
        const [ops, groups, models] = await Promise.all([
          catalogService.getOperators(undefined, idEmpresa),
          catalogService.getUnitGroups(undefined, idEmpresa),
          catalogService.getAvlModels(),
        ]);
        if (controller.signal.aborted) return;
        setOperators(ops);
        setUnitGroups(groups);
        setAvlModels(models);
      } catch (error) {
        if (controller.signal.aborted) return;
        handleError(error, "Error al cargar catálogos del formulario");
      } finally {
        if (!controller.signal.aborted) setLoadingCatalogs(false);
      }
    };

    loadCatalogs();

    return () => controller.abort();
  }, [open, idEmpresa]);

  const validateField = (
    name: keyof CreateUnitPayload,
    value: CreateUnitPayload[keyof CreateUnitPayload],
  ): FieldError => {
    // Primero validar presencia en campos obligatorios
    if (REQUIRED_FIELDS.includes(name)) {
      if (!value || (typeof value === "string" && !value.trim())) {
        return "Este campo es obligatorio";
      }
    }

    // Luego validar calidad del valor ingresado
    const strValue = String(value ?? "").trim();

    switch (name) {
      case "imei":
        // IMEI estándar: exactamente 15 dígitos numéricos
        if (strValue && !/^\d{15}$/.test(strValue)) {
          return "El IMEI debe tener exactamente 15 dígitos numéricos";
        }
        break;

      case "odometro_inicial": {
        const num = Number(strValue);
        if (strValue && (isNaN(num) || num < 0)) {
          return "El odómetro debe ser un número positivo";
        }
        break;
      }

      case "fecha_instalacion":
        // La fecha de instalación no puede ser futura
        if (strValue && strValue > new Date().toISOString().split("T")[0]) {
          return "La fecha de instalación no puede ser futura";
        }
        break;
    }

    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, FieldError> = {};
    let isValid = true;
    REQUIRED_FIELDS.forEach((field) => {
      const value = form[field];
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });
    setErrors(newErrors);
    // Marcar todos los campos obligatorios como tocados para que
    // los errores sean visibles aunque el usuario no haya interactuado
    const allTouched = REQUIRED_FIELDS.reduce<Record<string, boolean>>(
      (acc, field) => ({ ...acc, [field]: true }),
      {}
    );
    setTouched(allTouched);
    return isValid;
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    if (name === "id_grupo_unidades") return;

    setForm((prev) => ({ ...prev, [name]: value }));

    const error = validateField(name as keyof CreateUnitPayload, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name as keyof CreateUnitPayload, form[name as keyof CreateUnitPayload]);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleGroupSelectionChange = (newSelection: number[]) => {
    setForm((prev) => ({ ...prev, id_grupo_unidades: newSelection }));
  };


  const resetFormState = () => {
    setForm(defaultNewUnitForm);
    setErrors({});
    setTouched({});
    setStep(1);
    setError("");
  };

  const handleConfirmReset = () => {
    resetFormState();
    setIsResetConfirmOpen(false);
  };

  const handleConfirmClose = () => {
    resetFormState();
    setIsCloseConfirmOpen(false);
    onOpenChange(false);
  };

  const handleImageChange = (imageBase64: string) => {
    setForm((prev) => ({ ...prev, imagen: imageBase64 }));
  };


  const generalStepValid = useMemo(() => {
    return REQUIRED_FIELDS.every((field) => {
      const value = form[field];
      return value && (typeof value !== "string" || value.trim() !== "");
    });
  }, [form]);

  // Función auxiliar: analiza números de forma segura; devuelve null si la cadena está vacía
  const parseNumberOrNull = (value: string | number): number | null => {
    if (typeof value === "number") return value;
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  };

  // Normalización payload (sin lanzar excepciones, solo convierte tipos)
  const normalizePayload = (data: CreateUnitPayload) => {
    return {
      numero: data.numero.trim(),
      marca: data.marca.trim(),
      tipo: data.tipo,
      odometro_inicial: parseNumberOrNull(data.odometro_inicial) ?? 0,
      fecha_instalacion: data.fecha_instalacion,
      imei: data.imei.trim(),
      chip: data.chip.trim(),
      // Opcionales con posible vacío → null
      modelo: data.modelo?.trim() || null,
      anio: data.anio?.trim() || null,
      no_serie: data.no_serie?.trim() || null,
      matricula: data.matricula?.trim() || null,
      id_operador: data.id_operador ? Number(data.id_operador) : null,
      fecha_asignacion_operador: data.fecha_asignacion_operador?.trim() || null,
      id_grupo_unidades: data.id_grupo_unidades,
      id_modelo_avl: data.id_modelo_avl ? Number(data.id_modelo_avl) : null,
      input1: String(data.input1 ?? "0"),
      input2: String(data.input2 ?? "0"),
      output1: String(data.output1 ?? "0"),
      output2: String(data.output2 ?? "0"),
      tipo_combustible: data.tipo_combustible?.trim() || null,
      capacidad_tanque: parseNumberOrNull(data.capacidad_tanque ?? ""),
      rendimiento_establecido: parseNumberOrNull(data.rendimiento_establecido ?? ""),
      nombre_aseguradora: data.nombre_aseguradora?.trim() || null,
      telefono_aseguradora: data.telefono_aseguradora?.trim() || null,
      no_poliza_seguro: data.no_poliza_seguro?.trim() || null,
      vigencia_poliza_seguro: data.vigencia_poliza_seguro?.trim() || null,
      vigencia_verificacion_vehicular: data.vigencia_verificacion_vehicular?.trim() || null,
      imagen: data.imagen?.trim() || null,
    };
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setStep(1);
      // Dar tiempo a React para re-renderizar el paso antes de buscar el campo
      setTimeout(() => {
        const firstError = document.querySelector<HTMLElement>(
          "[aria-invalid='true'], .border-rose-400"
        );
        firstError?.focus();
      }, 50);
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      const payload = normalizePayload(form);
      // Incluir id_empresa en el body para que el backend lo reciba
      // correctamente cuando el usuario es sudo_erp (id_empresa null en JWT)
      await unitService.createUnit({ ...payload, id_empresa: idEmpresa });
      notify.success("Unidad creada correctamente");
      onCreated();
      resetFormState();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible crear la unidad";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} className="w-[96vw] max-w-[1100px] max-h-[92vh] overflow-hidden rounded-2xl p-0">
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
                      className={step === 1 ? "border-b-2 border-slate-700 pb-1 font-semibold text-slate-700" : "pb-1 text-slate-400"}
                    >
                      Datos Generales
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className={step === 2 ? "border-b-2 border-slate-700 pb-1 font-semibold text-slate-700" : "pb-1 text-slate-400"}
                    >
                      Datos Adicionales
                    </button>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button type="button" onClick={() => setIsResetConfirmOpen(true)} className="rounded-md p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600" title="Restablecer formulario">
                      <RotateCcw className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={() => setIsCloseConfirmOpen(true)} className="rounded-md p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600" title="Cerrar">
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
                  onBlur={handleBlur}
                  onGroupSelectionChange={handleGroupSelectionChange}
                  onImageChange={handleImageChange}
                  operators={operators}
                  unitGroups={unitGroups}
                  avlModels={avlModels}
                  loadingCatalogs={loadingCatalogs}
                  errors={errors}
                  touched={touched}
                />
              )}
              {step === 2 && <NewUnitAdditionalStep form={form} onChange={handleChange} />}
              {error && <p className="mt-6 text-sm text-rose-500">{error}</p>}
            </div>

            <div className="border-t border-slate-200 px-4 py-4 md:px-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <button type="button" disabled={step === 1} onClick={() => setStep(1)} className="text-slate-400 disabled:opacity-50">
                    &lt; Anterior
                  </button>
                  <button type="button" disabled={!generalStepValid} onClick={() => setStep(2)} className="text-slate-600 disabled:opacity-40">
                    Siguiente &gt;
                  </button>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={handleSubmit} disabled={isLoading} className="rounded bg-cyan-500 px-5 py-2 font-medium text-white hover:bg-cyan-600 disabled:opacity-50">
                    {isLoading ? "Guardando..." : "Guardar"}
                  </button>
                  <button type="button" onClick={() => setIsCloseConfirmOpen(true)} className="rounded border border-slate-300 px-5 py-2 text-slate-700 hover:bg-slate-50">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={isCloseConfirmOpen} onOpenChange={setIsCloseConfirmOpen} title="Cerrar formulario" description="Al cerrar, perderá la información capturada. ¿Desea cerrar el formulario?" confirmText="CERRAR FORMULARIO" confirmButtonClassName="bg-amber-400 text-white hover:bg-amber-500" onConfirm={handleConfirmClose} />
      <ConfirmDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen} title="Restablecer formulario" description="Al restablecer, se borrará la información capturada en el formulario y para comenzar de nuevo. ¿Desea restablecer el formulario?" confirmText="RESTABLECER FORMULARIO" confirmButtonClassName="bg-amber-400 text-white hover:bg-amber-500" onConfirm={handleConfirmReset} />
    </>
  );
};