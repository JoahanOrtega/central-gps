import { Circle, Pentagon } from "lucide-react"
import type { PoiItem } from "./poi.types"

interface PoiCardProps {
  poi: PoiItem
}

export const PoiCard = ({ poi }: PoiCardProps) => {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-slate-800">{poi.nombre}</h3>
          <p className="mt-1 text-sm text-slate-500">{poi.direccion || "Sin dirección"}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
          {poi.tipo_poi === 1 ? <Circle className="h-4 w-4" /> : <Pentagon className="h-4 w-4" />}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-slate-700">
        <div>
          <p className="font-medium">Elemento</p>
          <p>{poi.tipo_elemento}</p>
        </div>

        <div>
          <p className="font-medium">Radio</p>
          <p>{poi.radio}</p>
        </div>

        <div>
          <p className="font-medium">Latitud</p>
          <p>{poi.lat ?? "---"}</p>
        </div>

        <div>
          <p className="font-medium">Longitud</p>
          <p>{poi.lng ?? "---"}</p>
        </div>
      </div>
    </article>
  )
}