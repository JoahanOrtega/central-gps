import { useState } from "react"
import { MapPinned } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { poiService } from "../services/poiService"
import type { CreatePoiPayload } from "../types/poi.types"
import { notify } from "@/stores/notificationStore"
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva"
import { queryKeys } from "@/lib/query-keys"
import { ModalWithTabs } from "@/components/shared/ModalWithTabs"
import { Field, RadioOption, inputClass } from "@/components/shared/form-helpers"
import { GeoFenceTab } from "@/components/shared/GeoFenceTab"

interface NewPoiModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

const defaultForm: CreatePoiPayload = {
  tipo_elemento:         "poi",
  id_elemento:           0,
  nombre:                "",
  direccion:             "",
  direccionEsAproximada: false,
  tipo_poi:              1,
  tipo_marker:           0,
  url_marker:            "pin.svg",
  marker_path:           "MAP_PIN",
  marker_color:          "#5e6383",
  icon:                  "la la-industry",
  icon_color:            "#FFFFFF",
  lat:                   null,
  lng:                   null,
  radio:                 50,
  bounds:                "",
  area:                  "",
  radio_color:           "#5e6383",
  polygon_path:          "",
  polygon_color:         "#5e6383",
  observaciones:         "",
  id_grupo_pois:         [],
}

export const NewPoiModal = ({ open, onOpenChange, onCreated }: NewPoiModalProps) => {
  const { idEmpresa } = useEmpresaActiva()

  const [form, setForm]           = useState<CreatePoiPayload>(defaultForm)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState("")
  const [activeTab, setActiveTab] = useState("general")

  // Grupos cacheados 5 minutos — abrir el modal varias veces no genera peticiones repetidas
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey:  queryKeys.pois.groups(idEmpresa),
    queryFn:   () => poiService.getPoiGroups("", idEmpresa),
    enabled:   !!idEmpresa,
    staleTime: 5 * 60 * 1000,
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    const numericFields = ["tipo_poi", "tipo_marker", "radio"]
    setForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }))
  }

  const handleGroupChange = (groupId: number) => {
    setForm((prev) => ({
      ...prev,
      id_grupo_pois: prev.id_grupo_pois.includes(groupId)
        ? prev.id_grupo_pois.filter((id) => id !== groupId)
        : [...prev.id_grupo_pois, groupId],
    }))
  }

  const handleReset = () => {
    setForm(defaultForm)
    setError("")
    setActiveTab("general")
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) handleReset()
    onOpenChange(next)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError("")
    try {
      if (!form.nombre.trim()) {
        setError("El nombre es requerido")
        setActiveTab("general")
        return
      }
      if (!form.direccion.trim()) {
        setError("Debes definir el domicilio del punto de interés")
        setActiveTab("address")
        return
      }
      if (form.tipo_poi === 2) {
        const parsed = safeParsePolygon(form.polygon_path)
        if (parsed.length < 3) {
          setError("Para una geocerca poligonal debes marcar al menos 3 puntos")
          setActiveTab("address")
          return
        }
      }

      await poiService.createPoi(form, idEmpresa)
      notify.success("Punto de interés creado correctamente")
      onCreated()
      handleOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el POI")
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    {
      id: "general",
      label: "Datos del Punto",
      content: (
        <PoiGeneralTab
          form={form}
          groups={groups}
          isLoadingGroups={isLoadingGroups}
          onChange={handleInputChange}
          onGroupChange={handleGroupChange}
        />
      ),
    },
    {
      id: "address",
      label: "Domicilio",
      content: (
        // GeoFenceTab recibe los campos propios de POI 
        <GeoFenceTab
          value={form}
          onChange={(values) => setForm((prev) => ({ ...prev, ...values }))}
          required
          extraFields={
            <PoiExtraFields
              form={form}
              onChange={handleInputChange}
            />
          }
        />
      ),
    },
  ]

  return (
    <ModalWithTabs
      open={open}
      onOpenChange={handleOpenChange}
      title="Nuevo Punto de Interés"
      icon={MapPinned}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSave={handleSubmit}
      onReset={handleReset}
      isLoading={isLoading}
      error={error}
      confirmCloseDescription="Al cerrar, perderá la información capturada. ¿Desea cerrar el formulario?"
    />
  )
}

// Helper

const safeParsePolygon = (polygonPath: string) => {
  try {
    const parsed = JSON.parse(polygonPath)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Tab Datos del Punto

interface PoiGeneralTabProps {
  form:            CreatePoiPayload
  groups:          { id_grupo_pois: number; nombre: string }[]
  isLoadingGroups: boolean
  onChange:        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onGroupChange:   (groupId: number) => void
}

const PoiGeneralTab = ({
  form, groups, isLoadingGroups, onChange, onGroupChange,
}: PoiGeneralTabProps) => (
  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
    <section className="space-y-5">
      <Field label="Nombre *">
        <input name="nombre" value={form.nombre} onChange={onChange} className={inputClass} />
      </Field>

      <Field label="Asignar Grupos de POI">
        <div className="rounded border border-slate-300 bg-white p-3">
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {isLoadingGroups && <p className="text-sm text-slate-500">Cargando grupos...</p>}
            {!isLoadingGroups && groups.length === 0 && (
              <p className="text-sm text-slate-500">No hay grupos de POIs disponibles</p>
            )}
            {!isLoadingGroups && groups.map((group) => (
              <label key={group.id_grupo_pois} className="flex items-center gap-3 rounded px-2 py-2 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={form.id_grupo_pois.includes(group.id_grupo_pois)}
                  onChange={() => onGroupChange(group.id_grupo_pois)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-slate-700">{group.nombre}</span>
              </label>
            ))}
          </div>
        </div>
      </Field>

      <Field label="Observaciones">
        <textarea
          name="observaciones"
          value={form.observaciones}
          onChange={onChange}
          className="min-h-32 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
      </Field>
    </section>

    <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5">
      <h3 className="text-sm font-semibold text-slate-700">Resumen del punto</h3>
      <div className="mt-4 space-y-3 text-sm text-slate-600">
        <p><span className="font-medium text-slate-700">Nombre:</span> {form.nombre || "---"}</p>
        <p><span className="font-medium text-slate-700">Grupos:</span> {form.id_grupo_pois.length}</p>
        <p><span className="font-medium text-slate-700">Observaciones:</span> {form.observaciones || "---"}</p>
      </div>
    </aside>
  </div>
)

// Campos extra del tab Domicilio específicos de POI
interface PoiExtraFieldsProps {
  form:     CreatePoiPayload
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const PoiExtraFields = ({ form, onChange }: PoiExtraFieldsProps) => (
  <>
    {form.tipo_poi === 1 && (
      <>
        <Field label="Marcador *">
          <div className="flex flex-wrap items-center gap-4 pt-2 md:gap-6">
            <RadioOption checked label="Predefinido" onClick={() => {}} />
            <RadioOption checked={false} label="Crear Nuevo" onClick={() => {}} />
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
          <Field label="Color">
            <input name="radio_color" value={form.radio_color} onChange={onChange} className={inputClass} />
          </Field>
        </div>

        <Field label="Marcador">
          <input name="url_marker" value={form.url_marker} onChange={onChange} className={inputClass} />
        </Field>
      </>
    )}

    {form.tipo_poi === 2 && (
      <>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Color">
            <input name="polygon_color" value={form.polygon_color} onChange={onChange} className={inputClass} />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4" />
          Ocultar líneas y marcador guía
        </label>
      </>
    )}
  </>
)