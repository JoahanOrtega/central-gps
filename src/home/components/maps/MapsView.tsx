import { useRef, useState } from 'react'
import { MapPinned } from 'lucide-react'
import { MapToolbar } from './MapToolbar'
import { MapCanvas, type MapCanvasHandle } from './MapCanvas'
import { PoisDrawer } from './PoisDrawer'
import type { MapPoiItem } from './map.types'

export const MapsView = () => {
  const mapCanvasRef = useRef<MapCanvasHandle | null>(null)
  const [isPoisDrawerOpen, setIsPoisDrawerOpen] = useState(false)

  return (
    <main className="h-full overflow-hidden bg-[#f5f6f8] p-6">
      <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <MapPinned className="h-5 w-5 text-slate-500" />
            <h1 className="text-2xl font-semibold text-slate-800">Mapa</h1>
          </div>

          <MapToolbar
            onSearchAddress={(address) =>
              void mapCanvasRef.current?.searchAddress(address)
            }
            onToggleTraffic={() => mapCanvasRef.current?.toggleTraffic()}
            onClearMap={() => mapCanvasRef.current?.clearMap()}
            onFocusMap={() => mapCanvasRef.current?.focusMexico()}
            onFullscreen={() => mapCanvasRef.current?.toggleFullscreen()}
            onTogglePoisDrawer={() =>
              setIsPoisDrawerOpen((previousState) => !previousState)
            }
          />
        </div>

        <div className="relative flex-1 overflow-hidden">
          <MapCanvas ref={mapCanvasRef} />
          <PoisDrawer
            isOpen={isPoisDrawerOpen}
            onClose={() => setIsPoisDrawerOpen(false)}
            onSelectPoi={(poi: MapPoiItem) => {
              mapCanvasRef.current?.focusPoi(poi)
            }}
          />
        </div>
      </section>
    </main>
  )
}