import {
  Route,
  BusFront,
  MapPinned,
  GitBranch,
  Building2,
  Users,
  Fuel,
  TrafficCone,
  Eraser,
  Focus,
  Maximize,
  Save,
} from "lucide-react"
import { useState } from "react"

const toolbarButtonClass =
  "flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"

interface MapToolbarProps {
  onSearchAddress: (address: string) => void
  onToggleTraffic: () => void
  onClearMap: () => void
  onFocusMap: () => void
  onFullscreen: () => void
  onTogglePoisDrawer: () => void
}

export const MapToolbar = ({
  onSearchAddress,
  onToggleTraffic,
  onClearMap,
  onFocusMap,
  onFullscreen,
  onTogglePoisDrawer,
}: MapToolbarProps) => {
  const [search, setSearch] = useState("")

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearchAddress(search)
  }

  return (
    <div className="flex items-center gap-2">
      <form
        onSubmit={handleSubmit}
        className="flex items-center rounded-md border border-slate-300 bg-white"
      >
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="buscador de direcciones"
          className="h-10 w-72 px-3 text-sm outline-none"
        />
      </form>

      <button type="button" className={toolbarButtonClass} title="Consulta de recorrido">
        <Route className="h-4 w-4" />
      </button>

      <button type="button" className={toolbarButtonClass} title="Unidades">
        <BusFront className="h-4 w-4" />
      </button>

      <button
        type="button"
        className={toolbarButtonClass}
        title="Puntos de interés"
        onClick={onTogglePoisDrawer}
      >
        <MapPinned className="h-4 w-4" />
      </button>

      <button type="button" className={toolbarButtonClass} title="Rutas">
        <GitBranch className="h-4 w-4" />
      </button>

      <button type="button" className={toolbarButtonClass} title="Clientes">
        <Building2 className="h-4 w-4" />
      </button>

      <button type="button" className={toolbarButtonClass} title="Operadores">
        <Users className="h-4 w-4" />
      </button>

      <button type="button" className={toolbarButtonClass} title="Gasolineras">
        <Fuel className="h-4 w-4" />
      </button>

      <button
        type="button"
        className={toolbarButtonClass}
        title="Ver tráfico"
        onClick={onToggleTraffic}
      >
        <TrafficCone className="h-4 w-4" />
      </button>

      <button
        type="button"
        className={toolbarButtonClass}
        title="Limpiar el mapa"
        onClick={onClearMap}
      >
        <Eraser className="h-4 w-4" />
      </button>

      <button
        type="button"
        className={toolbarButtonClass}
        title="Enfocar"
        onClick={onFocusMap}
      >
        <Focus className="h-4 w-4" />
      </button>

      <button
        type="button"
        className={toolbarButtonClass}
        title="Pantalla completa"
        onClick={onFullscreen}
      >
        <Maximize className="h-4 w-4" />
      </button>

      <button
        type="button"
        className={toolbarButtonClass}
        title="Guardar sesión del mapa"
      >
        <Save className="h-4 w-4" />
      </button>
    </div>
  )
}