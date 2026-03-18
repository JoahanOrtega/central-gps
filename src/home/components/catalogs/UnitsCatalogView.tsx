import { useEffect, useMemo, useState } from "react"
import { BusFront, Search, Download, X, TriangleAlert } from "lucide-react"

import { unitService } from "../../services/unitService"
import type { UnitItem } from "../../types/unit.types"
import { UnitCard } from "./UnitCard"

export const UnitsCatalogView = () => {
  const [units, setUnits] = useState<UnitItem[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadUnits = async () => {
      try {
        setIsLoading(true)
        setError("")

        const data = await unitService.getUnits()
        setUnits(data)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al cargar unidades"
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadUnits()
  }, [])

  const filteredUnits = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) {
      return units
    }

    return units.filter((unit) => {
      return (
        unit.numero.toLowerCase().includes(term) ||
        unit.marca.toLowerCase().includes(term) ||
        unit.modelo.toLowerCase().includes(term) ||
        unit.matricula.toLowerCase().includes(term) ||
        unit.imei.toLowerCase().includes(term)
      )
    })
  }, [search, units])

  return (
    <main className="h-full overflow-y-auto bg-[#f5f6f8] p-6">
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <BusFront className="h-5 w-5 text-slate-500" />
            <h1 className="text-2xl font-semibold text-slate-800">
              Catálogo de Unidades
            </h1>
          </div>

          <div className="flex items-center gap-3">
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

            <button
              type="button"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            >
              <Download className="h-5 w-5" />
            </button>

            <button
              type="button"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-amber-500"
            >
              <TriangleAlert className="h-5 w-5" />
            </button>

            <button
              type="button"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700"
            >
              Todas <span className="ml-1 text-slate-400">{units.length}</span>
            </button>

            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700"
            >
              Sin Grupo <span className="ml-1 text-slate-400">{units.length}</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {isLoading && (
            <div className="py-10 text-center text-slate-500">
              Cargando unidades...
            </div>
          )}

          {error && (
            <div className="py-10 text-center text-red-500">{error}</div>
          )}

          {!isLoading && !error && filteredUnits.length === 0 && (
            <div className="py-10 text-center text-slate-500">
              No hay unidades para mostrar
            </div>
          )}

          {!isLoading && !error && filteredUnits.length > 0 && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {filteredUnits.map((unit) => (
                <UnitCard key={unit.id} unit={unit} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}