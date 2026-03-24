import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { poiService } from "../../services/poiService"
import type { CreatePoiPayload, PoiGroupItem } from "../../types/poi.types"
import { PoiGeometryEditor } from "./PoiGeometryEditor"

interface NewPoiModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

interface ClientOption {
  id_cliente: number
  nombre: string
}

const defaultForm: CreatePoiPayload = {
  tipo_elemento: "poi",
  id_elemento: 0,
  nombre: "",
  direccion: "",
  tipo_poi: 1,
  tipo_marker: 0,
  url_marker: "pin.svg",
  marker_path: "MAP_PIN",
  marker_color: "#5e6383",
  icon: "la la-industry",
  icon_color: "#FFFFFF",
  lat: null,
  lng: null,
  radio: 50,
  bounds: "",
  area: "",
  radio_color: "#5e6383",
  polygon_path: "",
  polygon_color: "#5e6383",
  observaciones: "",
  id_grupo_pois: [],
}

export const NewPoiModal = ({
  open,
  onOpenChange,
  onCreated,
}: NewPoiModalProps) => {
  const [form, setForm] = useState<CreatePoiPayload>(defaultForm)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [clients, setClients] = useState<ClientOption[]>([])
  const [groups, setGroups] = useState<PoiGroupItem[]>([])
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false)

  useEffect(() => {
    if (!open) return

    const loadCatalogs = async () => {
      try {
        setIsLoadingCatalogs(true)

        const [clientsData, groupsData] = await Promise.all([
          poiService.getClients(),
          poiService.getPoiGroups(),
        ])

        setClients(clientsData)
        setGroups(groupsData)
      } catch {
        setClients([])
        setGroups([])
      } finally {
        setIsLoadingCatalogs(false)
      }
    }

    loadCatalogs()
  }, [open])

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target

    if (name === "tipo_poi" || name === "tipo_marker" || name === "radio") {
      setForm((prev) => ({
        ...prev,
        [name]: Number(value),
      }))
      return
    }

    if (name === "id_elemento") {
      setForm((prev) => ({
        ...prev,
        id_elemento: Number(value),
      }))
      return
    }

    if (name === "lat" || name === "lng") {
      setForm((prev) => ({
        ...prev,
        [name]: value === "" ? null : Number(value),
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleGroupChange = (groupId: number) => {
    setForm((prev) => {
      const exists = prev.id_grupo_pois.includes(groupId)

      return {
        ...prev,
        id_grupo_pois: exists
          ? prev.id_grupo_pois.filter((id) => id !== groupId)
          : [...prev.id_grupo_pois, groupId],
      }
    })
  }

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      setError("")

      await poiService.createPoi(form)
      onCreated()
      setForm(defaultForm)
      onOpenChange(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No fue posible guardar el POI"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[95vw] max-w-[950px] max-h-[90vh] overflow-hidden p-0"
      >
        <DialogHeader className="border-b border-slate-200 px-6 py-4">
          <DialogTitle className="text-2xl font-semibold text-slate-700">
            Nuevo Punto de Interés
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(90vh-140px)] overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              <Field label="Nombre *">
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>

              <Field label="Dirección">
                <input
                  name="direccion"
                  value={form.direccion}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Tipo de POI">
                  <select
                    name="tipo_poi"
                    value={String(form.tipo_poi)}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="1">Circular</option>
                    <option value="2">Poligonal</option>
                  </select>
                </Field>

                <Field label="Tipo de elemento">
                  <select
                    name="tipo_elemento"
                    value={form.tipo_elemento}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="poi">POI</option>
                    <option value="clt">Cliente</option>
                    <option value="op">Operador</option>
                    <option value="gas">Gasolinera</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitud">
                  <input
                    name="lat"
                    value={form.lat ?? ""}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </Field>

                <Field label="Longitud">
                  <input
                    name="lng"
                    value={form.lng ?? ""}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Radio">
                <input
                  name="radio"
                  value={form.radio}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>

              <Field label="Cliente">
                <select
                  name="id_elemento"
                  value={form.id_elemento}
                  onChange={handleChange}
                  className={inputClass}
                  disabled={isLoadingCatalogs}
                >
                  <option value={0}>-seleccione-</option>
                  {clients.map((client) => (
                    <option key={client.id_cliente} value={client.id_cliente}>
                      {client.nombre}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Observaciones">
                <textarea
                  name="observaciones"
                  value={form.observaciones}
                  onChange={handleChange}
                  className="min-h-28 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </Field>
            </div>

            <div className="space-y-4">
              <Field label="Grupos de POIs">
                <div className="rounded border border-slate-300 bg-white p-3">
                  <div className="max-h-52 space-y-2 overflow-y-auto">
                    {isLoadingCatalogs && (
                      <p className="text-sm text-slate-500">Cargando grupos...</p>
                    )}

                    {!isLoadingCatalogs && groups.length === 0 && (
                      <p className="text-sm text-slate-500">
                        No hay grupos de POIs disponibles
                      </p>
                    )}

                    {!isLoadingCatalogs &&
                      groups.map((group) => {
                        const checked = form.id_grupo_pois.includes(group.id_grupo_pois)

                        return (
                          <label
                            key={group.id_grupo_pois}
                            className="flex items-center gap-3 rounded px-2 py-2 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleGroupChange(group.id_grupo_pois)}
                              className="h-4 w-4"
                            />
                            <span className="text-sm text-slate-700">
                              {group.nombre}
                            </span>
                          </label>
                        )
                      })}
                  </div>
                </div>
              </Field>

              <Field label="Color del marcador">
                <input
                  name="marker_color"
                  value={form.marker_color}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>

              <Field label="Color del polígono">
                <input
                  name="polygon_color"
                  value={form.polygon_color}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>

              <Field label="Color del radio">
                <input
                  name="radio_color"
                  value={form.radio_color}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <PoiGeometryEditor
                  value={{
                    tipo_poi: form.tipo_poi,
                    lat: form.lat,
                    lng: form.lng,
                    radio: form.radio,
                    bounds: form.bounds,
                    area: form.area,
                    polygon_path: form.polygon_path,
                    polygon_color: form.polygon_color,
                    radio_color: form.radio_color,
                  }}
                  onChange={(geometryValues) =>
                    setForm((prev) => ({
                      ...prev,
                      ...geometryValues,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {error && <p className="mt-6 text-sm text-rose-500">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded border border-slate-300 px-5 py-2 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="rounded bg-cyan-500 px-5 py-2 font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {isLoading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const inputClass =
  "h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400"

const Field = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-600">{label}</span>
      {children}
    </label>
  )
}