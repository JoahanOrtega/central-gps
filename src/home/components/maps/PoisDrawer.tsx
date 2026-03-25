import { ChevronRight, MapPin, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { MapPoiItem } from './map.types'
import { poiService } from '../../services/poiService'

interface PoisDrawerProps {
    isOpen: boolean
    onClose: () => void
    onSelectPoi: (poi: MapPoiItem) => void
}

export const PoisDrawer = ({ isOpen, onClose, onSelectPoi }: PoisDrawerProps) => {
    const [pois, setPois] = useState<MapPoiItem[]>([])
    const [search, setSearch] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!isOpen) return

        const loadPois = async () => {
            try {
                setIsLoading(true)
                setError('')

                const data = await poiService.getPois()
                setPois(data)
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'No fue posible cargar los puntos de interés'
                setError(message)
            } finally {
                setIsLoading(false)
            }
        }

        void loadPois()
    }, [isOpen])

    const filteredPois = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase()

        if (!normalizedSearch) return pois

        return pois.filter((poi) => {
            const name = poi.nombre?.toLowerCase() ?? ''
            const address = poi.direccion?.toLowerCase() ?? ''

            return name.includes(normalizedSearch) || address.includes(normalizedSearch)
        })
    }, [pois, search])

    return (
        <aside
            className={`absolute right-0 top-0 z-20 h-full w-[360px] border-l border-slate-200 bg-white shadow-xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
        >
            <div className="flex h-full flex-col">
                <div className="border-b border-slate-200 px-4 py-3">
                    <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Puntos de interés..."
                            className="h-10 w-full text-sm outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading && (
                        <div className="px-4 py-6 text-sm text-slate-500">Cargando POIs...</div>
                    )}

                    {error && (
                        <div className="px-4 py-6 text-sm text-rose-500">{error}</div>
                    )}

                    {!isLoading && !error && filteredPois.length === 0 && (
                        <div className="px-4 py-6 text-sm text-slate-500">
                            No hay puntos de interés para mostrar.
                        </div>
                    )}

                    {!isLoading &&
                        !error &&
                        filteredPois.map((poi) => (
                            <button
                                key={poi.id_poi}
                                type="button"
                                onClick={() => onSelectPoi(poi)}
                                className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-4 text-left hover:bg-slate-50"
                            >
                                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500">
                                    <MapPin className="h-4 w-4" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-700">
                                        {poi.nombre || 'Sin nombre'}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                        {poi.direccion || 'Sin dirección'}
                                    </p>
                                </div>

                                <div className="pt-1 text-slate-400">
                                    <ChevronRight className="h-4 w-4" />
                                </div>
                            </button>
                        ))}
                </div>
            </div>
        </aside>
    )
}