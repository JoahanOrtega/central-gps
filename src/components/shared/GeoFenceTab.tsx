import { useRef } from "react"
import { Field, RadioOption, inputClass } from "@/components/shared/form-helpers"
import {
  PoiGeometryEditor,
  type PoiGeometryEditorHandle,
} from "@/features/catalogs/pois/components/PoiGeometryEditor"

export interface GeoFenceValue {
  tipo_poi:              number
  direccion:             string
  direccionEsAproximada: boolean
  lat:                   number | null
  lng:                   number | null
  radio:                 number
  bounds:                string
  area:                  string
  polygon_path:          string
  polygon_color:         string
  radio_color:           string
}

interface GeoFenceTabProps {
  value:    GeoFenceValue
  onChange: (values: Partial<GeoFenceValue>) => void

  // Slot opcional para campos extra encima del mapa
  extraFields?: React.ReactNode

  // Slot opcional para mostrar info adicional debajo de los campos
  infoSlot?: React.ReactNode

  // Hace que Dirección y Tipo de Geocerca muestren asterisco de requerido.
  required?: boolean
}

export const GeoFenceTab = ({
  value,
  onChange,
  extraFields,
  infoSlot,
  required = false,
}: GeoFenceTabProps) => {
  const geometryEditorRef = useRef<PoiGeometryEditorHandle | null>(null)

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] xl:gap-8">
      <section className="space-y-5">

        <Field label={`Tipo de Geocerca${required ? " *" : ""}`}>
          <div className="flex flex-wrap items-center gap-4 pt-2 md:gap-6">
            <RadioOption
              checked={value.tipo_poi === 1}
              label="Circular"
              onClick={() => onChange({ tipo_poi: 1, polygon_path: "", area: "" })}
            />
            <RadioOption
              checked={value.tipo_poi === 2}
              label="Poligonal"
              onClick={() => onChange({ tipo_poi: 2, lat: value.lat, lng: value.lng })}
            />
          </div>
        </Field>

        <Field label={`Dirección${required ? " *" : ""}`}>
          <input
            name="direccion"
            value={value.direccion}
            onChange={(e) => onChange({ direccion: e.target.value })}
            className={inputClass}
            placeholder="Buscar lugar o dirección en el mapa"
          />
        </Field>

        {value.direccionEsAproximada && (
          <p className="-mt-2 text-xs text-amber-600">
            Ubicación encontrada. Se muestra dirección aproximada.
          </p>
        )}

        {/* Radio */}
        {value.tipo_poi === 1 && (
          <Field label={`Radio de la Circunferencia${required ? " *" : ""}`}>
            <div className="relative">
              <input
                name="radio"
                type="number"
                min={1}
                value={value.radio}
                onChange={(e) => onChange({ radio: Number(e.target.value) })}
                className={`${inputClass} pr-20`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                metros
              </span>
            </div>
          </Field>
        )}

        {/* Herramientas del poligono */}
        {value.tipo_poi === 2 && (
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
        )}

        {/* Campos extra del modulo color, marcador, etc. */}
        {extraFields}

        {/* Info adicional */}
        {infoSlot}

      </section>

      {/* Mapa */}
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4">
        <PoiGeometryEditor
          ref={geometryEditorRef}
          value={value}
          onChange={(geometryValues) => onChange(geometryValues)}
        />
      </section>
    </div>
  )
}