import { useState } from "react"
import { FolderTree, RotateCcw, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { poiService } from "./poiService"
import type { CreatePoiGroupPayload } from "./poi.types"
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva"
import { notify } from "@/stores/notificationStore"
import { useClients } from "@/hooks/useCatalogQueries"

interface NewPoiGroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

const defaultForm: CreatePoiGroupPayload = {
  id_cliente: null,
  nombre: "",
  observaciones: "",
  is_default: 0,
}

const inputClass =
  "h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400"

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-2 block text-sm text-slate-600">{label}</span>
    {children}
  </label>
)

export const NewPoiGroupModal = ({ open, onOpenChange, onCreated }: NewPoiGroupModalProps) => {
  const [form, setForm] = useState<CreatePoiGroupPayload>(defaultForm)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const { idEmpresa } = useEmpresaActiva()

  // TanStack Query — mismo caché compartido con NewPoiModal si ya cargó clientes
  const { data: clients = [], isLoading: isLoadingClients } = useClients(idEmpresa)

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target
    if (name === "id_cliente") {
      setForm((prev) => ({ ...prev, id_cliente: value ? Number(value) : null }))
      return
    }
    if (name === "is_default") {
      setForm((prev) => ({ ...prev, is_default: Number(value) }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleReset = () => { setForm(defaultForm); setError("") }
  const handleClose = () => { handleReset(); onOpenChange(false) }

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      setError("")
      if (!form.nombre.trim()) { setError("El nombre del grupo es requerido"); return }
      await poiService.createPoiGroup(form)
      notify.success("Grupo de POI creado correctamente")
      onCreated()
      handleReset()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el grupo")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[95vw] max-w-[720px] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="flex items-center gap-3 text-3xl font-semibold text-slate-700">
              <FolderTree className="h-5 w-5 text-slate-400" />
              Nuevo Grupo de Puntos de Interés
            </DialogTitle>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleReset} className="rounded-md p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600" title="Restablecer formulario">
                <RotateCcw className="h-5 w-5" />
              </button>
              <button type="button" onClick={handleClose} className="rounded-md p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600" title="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(90vh-140px)] overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            <Field label="Cliente">
              <select name="id_cliente" value={form.id_cliente ?? ""} onChange={handleChange} className={inputClass} disabled={isLoadingClients}>
                <option value="">-seleccione-</option>
                {clients.map((c) => (
                  <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Nombre del grupo *">
              <input name="nombre" value={form.nombre} onChange={handleChange} className={inputClass} placeholder="Ej. Clientes Norte" />
            </Field>
            <Field label="Observaciones">
              <textarea name="observaciones" value={form.observaciones} onChange={handleChange} className="min-h-28 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" placeholder="Observaciones del grupo" />
            </Field>
            <Field label="Predeterminado">
              <select name="is_default" value={form.is_default} onChange={handleChange} className={inputClass}>
                <option value={0}>No</option>
                <option value={1}>Sí</option>
              </select>
            </Field>
            {error && <p className="text-sm text-rose-500">{error}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={handleClose} className="rounded border border-slate-300 px-5 py-2 text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={isLoading} className="rounded bg-cyan-500 px-5 py-2 font-medium text-white hover:bg-cyan-600 disabled:opacity-50">
            {isLoading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}