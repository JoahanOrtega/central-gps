import { useEffect, useState } from "react"
import { MapPinned, Plus, Search } from "lucide-react"

import { poiService } from "../../services/poiService"
import type { PoiItem } from "../../types/poi.types"
import { PoiCard } from "./PoiCard"
import { NewPoiModal } from "./NewPoiModal"

export const PointsOfInterestView = () => {
  const [pois, setPois] = useState<PoiItem[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const loadPois = async (searchValue = "") => {
    try {
      setIsLoading(true)
      setError("")
      const data = await poiService.getPois(searchValue)
      setPois(data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al cargar los POIs"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadPois(search)
    }, 350)

    return () => clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    loadPois()
  }, [])

  return (
    <main className="h-full overflow-y-auto bg-[#f5f6f8] p-6">
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <MapPinned className="h-5 w-5 text-slate-500" />
            <h1 className="text-2xl font-semibold text-slate-800">
              Catálogo de Puntos de Interés
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex h-10 w-12 items-center justify-center rounded-lg border border-emerald-400 bg-white text-emerald-500 hover:bg-emerald-50"
              title="Agregar POI"
            >
              <Plus className="h-4 w-4" />
            </button>

            <div className="flex items-center rounded-lg border border-slate-300 bg-white">
              <div className="flex h-10 w-10 items-center justify-center border-r border-slate-300 text-emerald-500">
                <Search className="h-4 w-4" />
              </div>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="buscar..."
                className="h-10 w-56 rounded-r-lg px-3 text-sm outline-none"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading && <div className="py-10 text-center text-slate-500">Cargando POIs...</div>}
          {error && <div className="py-10 text-center text-red-500">{error}</div>}

          {!isLoading && !error && pois.length === 0 && (
            <div className="py-10 text-center text-slate-500">
              No hay puntos de interés para mostrar
            </div>
          )}

          {!isLoading && !error && pois.length > 0 && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {pois.map((poi) => (
                <PoiCard key={poi.id_poi} poi={poi} />
              ))}
            </div>
          )}
        </div>
      </section>

      <NewPoiModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreated={() => loadPois(search)}
      />
    </main>
  )
}