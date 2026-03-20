import { useMemo, useState } from "react"
import { BusFront, RotateCcw, X } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { unitService } from "../../services/unitService"
import { defaultNewUnitForm } from "./new-unit-form.constants"
import { NewUnitGeneralStep } from "./NewUnitGeneralStep"
import { NewUnitAdditionalStep } from "./NewUnitAdditionalStep"
import type { NewUnitModalProps } from "./new-unit-form.types"
import type { CreateUnitPayload } from "../../types/unit.types"

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

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

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
        form.chip.trim(),
    )
  }, [form])

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      setError("")

      await unitService.createUnit(form)
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="w-[95vw] max-w-[1100px] max-h-[90vh] overflow-hidden p-0"
        >
          <DialogHeader className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="flex items-center gap-3 text-3xl font-semibold text-slate-700">
                <BusFront className="h-5 w-5 text-slate-400" />
                Nueva Unidad
              </DialogTitle>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-6 text-sm">
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
          </DialogHeader>

          <div className="max-h-[calc(90vh-145px)] overflow-y-auto px-6 py-6">
            {step === 1 && (
              <NewUnitGeneralStep form={form} onChange={handleChange} />
            )}

            {step === 2 && (
              <NewUnitAdditionalStep form={form} onChange={handleChange} />
            )}

            {error && <p className="mt-6 text-sm text-rose-500">{error}</p>}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
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

            <div className="flex items-center gap-3">
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
        </DialogContent>
      </Dialog>

      <FormConfirmDialog
        open={isCloseConfirmOpen}
        onOpenChange={setIsCloseConfirmOpen}
        title="Cerrar formulario"
        description="Al cerrar, perderá la información capturada. ¿Desea cerrar el formulario?"
        confirmText="CERRAR FORMULARIO"
        confirmButtonClassName="bg-amber-400 text-white hover:bg-amber-500"
        onConfirm={handleConfirmClose}
      />

      <FormConfirmDialog
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

interface FormConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText: string
  confirmButtonClassName: string
  onConfirm: () => void
}

const FormConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  confirmButtonClassName,
  onConfirm,
}: FormConfirmDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[420px] overflow-hidden rounded-lg p-0"
      >
        <div className="h-3 w-full bg-amber-400" />

        <div className="px-6 py-5">
          <h3 className="text-2xl font-semibold text-slate-800">{title}</h3>
          <p className="mt-4 text-base leading-7 text-slate-700">{description}</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onConfirm}
              className={`rounded px-4 py-2 font-semibold ${confirmButtonClassName}`}
            >
              {confirmText}
            </button>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded bg-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-300"
            >
              CANCELAR
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}