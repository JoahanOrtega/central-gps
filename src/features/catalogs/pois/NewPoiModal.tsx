import { useRef, useState } from "react"
import { MapPinned, RotateCcw, X } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"

import { poiService } from "./poiService"
import type { CreatePoiPayload, PoiGroupItem } from "./poi.types"
import {
  PoiGeometryEditor,
  type PoiGeometryEditorHandle,
} from "./PoiGeometryEditor"

import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { notify } from "@/stores/notificationStore"
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva"

// ── TanStack Query — catálogos del formulario ─────────────────────────────────
// usePoiGroups usa el caché de 5 minutos — abrir este modal varias veces
// seguidas solo hace 1 petición real al backend.
import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"


interface NewPoiModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

const defaultForm: CreatePoiPayload = {
  tipo_elemento: "poi",
  id_elemento: 0,
  nombre: "",
  direccion: "",
  direccionEsAproximada: false,
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
  const [activeTab, setActiveTab] = useState<"general" | "address">("general")
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false)

  const { idEmpresa } = useEmpresaActiva()
  const geometryEditorRef = useRef<PoiGeometryEditorHandle | null>(null)

  // ── Grupos de POI con TanStack Query ───────────────────────────────────────
  // Reemplaza el useEffect+AbortController anterior.
  // Los grupos se cachean 5 minutos — abrir el modal varias veces no genera
  // peticiones repetidas al backend.
  const { data: groups = [], isLoading: isLoadingCatalogs } = useQuery({
    queryKey: queryKeys.pois.groups(idEmpresa),
    queryFn: () => poiService.getPoiGroups("", idEmpresa),
    enabled: !!idEmpresa,
    staleTime: 5 * 60 * 1000,
  })

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target

    if (name === "tipo_poi" || name === "tipo_marker" || name === "radio") {
      setForm((prev) => ({
        ...prev,
        [name]: Number(value),
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }
  const handleRequestClose = () => {
    setIsCloseConfirmOpen(true)
  }

  const handleConfirmClose = () => {
    onOpenChange(false)
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

  const handleReset = () => {
    setForm(defaultForm)
    setError("")
    setActiveTab("general")
  }

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      setError("")

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
        const parsedPath = safeParsePolygon(form.polygon_path)
        if (parsedPath.length < 3) {
          setError("Para una geocerca poligonal debes marcar al menos 3 puntos")
          setActiveTab("address")
          return
        }
      }

      await poiService.createPoi(form)
      notify.success("Punto de interés creado correctamente")
      onCreated()
      handleReset()
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="w-[96vw] max-w-[1280px] h-[92dvh] max-h-[92dvh] overflow-hidden rounded-2xl p-0"
        >
          <div className="flex h-full min-h-0 flex-col">
            <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-4 md:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-slate-700 md:text-2xl">
                    <MapPinned className="h-5 w-5 text-slate-400" />
                    Nuevo Punto de Interés
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Formulario para registrar un nuevo punto de interés con información general y ubicación.
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-auto">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-md p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    title="Restablecer formulario"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestClose}
                    className="rounded-md p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    title="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </DialogHeader>

            <div className="shrink-0 border-b border-slate-200 px-4 pt-4 md:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <TabButton
                  active={activeTab === "general"}
                  onClick={() => setActiveTab("general")}
                >
                  Datos del Punto
                </TabButton>

                <TabButton
                  active={activeTab === "address"}
                  onClick={() => setActiveTab("address")}
                >
                  Domicilio
                </TabButton>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
              {activeTab === "general" && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
                  <section className="space-y-5">
                    <Field label="Nombre *">
                      <input
                        name="nombre"
                        value={form.nombre}
                        onChange={handleInputChange}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Asignar Grupos de POI">
                      <div className="rounded border border-slate-300 bg-white p-3">
                        <div className="max-h-72 space-y-2 overflow-y-auto">
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

                    <Field label="Observaciones">
                      <textarea
                        name="observaciones"
                        value={form.observaciones}
                        onChange={handleInputChange}
                        className="min-h-32 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    </Field>
                  </section>

                  <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Resumen del punto
                    </h3>

                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <p>
                        <span className="font-medium text-slate-700">Nombre:</span>{" "}
                        {form.nombre || "---"}
                      </p>

                      <p>
                        <span className="font-medium text-slate-700">Grupos:</span>{" "}
                        {form.id_grupo_pois.length}
                      </p>

                      <p>
                        <span className="font-medium text-slate-700">Observaciones:</span>{" "}
                        {form.observaciones || "---"}
                      </p>
                    </div>
                  </aside>
                </div>
              )}

              {activeTab === "address" && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] xl:gap-8">
                  <section className="space-y-5">
                    <Field label="Tipo de Geocerca *">
                      <div className="flex flex-wrap items-center gap-4 pt-2 md:gap-6">
                        <RadioOption
                          checked={form.tipo_poi === 1}
                          label="Circular"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              tipo_poi: 1,
                              polygon_path: "",
                              area: "",
                            }))
                          }
                        />

                        <RadioOption
                          checked={form.tipo_poi === 2}
                          label="Poligonal"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              tipo_poi: 2,
                              lat: prev.lat,
                              lng: prev.lng,
                            }))
                          }
                        />
                      </div>
                    </Field>

                    <Field label="Dirección *">
                      <input
                        name="direccion"
                        value={form.direccion}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder="Buscar lugar o dirección en el mapa"
                      />
                    </Field>

                    {form.direccionEsAproximada && (
                      <p className="-mt-2 text-xs text-amber-600">
                        Ubicación encontrada. Se muestra dirección aproximada.
                      </p>
                    )}

                    {form.tipo_poi === 1 && (
                      <>
                        <Field label="Marcador *">
                          <div className="flex flex-wrap items-center gap-4 pt-2 md:gap-6">
                            <RadioOption checked label="Predefinido" onClick={() => { }} />
                            <RadioOption checked={false} label="Crear Nuevo" onClick={() => { }} />
                          </div>
                        </Field>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
                          <Field label="Radio de la Circunferencia *">
                            <div className="relative">
                              <input
                                name="radio"
                                type="number"
                                min={1}
                                value={form.radio}
                                onChange={handleInputChange}
                                className={`${inputClass} pr-20`}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                metros
                              </span>
                            </div>
                          </Field>

                          <Field label="Color">
                            <input
                              name="radio_color"
                              value={form.radio_color}
                              onChange={handleInputChange}
                              className={inputClass}
                            />
                          </Field>
                        </div>

                        <Field label="Marcador">
                          <input
                            name="url_marker"
                            value={form.url_marker}
                            onChange={handleInputChange}
                            className={inputClass}
                          />
                        </Field>
                      </>
                    )}

                    {form.tipo_poi === 2 && (
                      <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <Field label="Color">
                            <input
                              name="polygon_color"
                              value={form.polygon_color}
                              onChange={handleInputChange}
                              className={inputClass}
                            />
                          </Field>

                          <Field label="Herramientas">
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <button
                                type="button"
                                onClick={() => geometryEditorRef.current?.clearAll()}
                                className="rounded border border-red-300 bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
                              >
                                Borrar Todo
                              </button>

                              <button
                                type="button"
                                onClick={() => geometryEditorRef.current?.undoLastPoint()}
                                className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                Paso Atrás
                              </button>
                            </div>
                          </Field>
                        </div>

                        <label className="flex items-center gap-3 text-sm text-slate-600">
                          <input type="checkbox" className="h-4 w-4" />
                          Ocultar líneas y marcador guía
                        </label>
                      </>
                    )}
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4">
                    <PoiGeometryEditor
                      ref={geometryEditorRef}
                      value={{
                        tipo_poi: form.tipo_poi,
                        direccion: form.direccion,
                        direccionEsAproximada: form.direccionEsAproximada,
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
                  </section>
                </div>
              )}

              {error && <p className="mt-6 text-sm text-rose-500">{error}</p>}
            </div>

            <div className="shrink-0 border-t border-slate-200 px-4 py-4 md:px-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    disabled={activeTab === "general"}
                    onClick={() => setActiveTab("general")}
                    className="text-slate-400 disabled:opacity-50"
                  >
                    &lt; Anterior
                  </button>

                  <button
                    type="button"
                    disabled={activeTab === "address"}
                    onClick={() => setActiveTab("address")}
                    className="text-slate-600 disabled:opacity-40"
                  >
                    Siguiente &gt;
                  </button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleRequestClose}
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
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog >
      <ConfirmDialog
        open={isCloseConfirmOpen}
        onOpenChange={setIsCloseConfirmOpen}
        title="Cerrar formulario"
        description="Al cerrar, perderá la información capturada. ¿Desea cerrar el formulario?"
        confirmText="CERRAR FORMULARIO"
        confirmButtonClassName="bg-amber-400 text-white hover:bg-amber-500"
        onConfirm={handleConfirmClose}
      />
    </>
  )
}

const safeParsePolygon = (polygonPath: string) => {
  try {
    const parsed = JSON.parse(polygonPath)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
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

const TabButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-t-lg px-4 py-3 text-sm font-medium ${active
        ? "border border-b-white border-slate-200 bg-white text-slate-700"
        : "text-slate-500 hover:text-slate-700"
        }`}
    >
      {children}
    </button>
  )
}

const RadioOption = ({
  checked,
  label,
  onClick,
}: {
  checked: boolean
  label: string
  onClick: () => void
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-sm text-slate-700"
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border ${checked ? "border-slate-500" : "border-slate-300"
          }`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-slate-500" />}
      </span>
      {label}
    </button>
  )
}