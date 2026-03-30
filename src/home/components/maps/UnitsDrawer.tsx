import { useEffect, useMemo, useState } from 'react'
import { monitorService } from '@/home/services/monitorService'
import type { MapUnitItem } from './map.types'

interface UnitsDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSelectUnit: (unit: MapUnitItem) => void
  onUnitsSelectionChange: (units: MapUnitItem[]) => void
  onUnitsHidden: () => void
}

export const UnitsDrawer = ({
  isOpen,
  onClose,
  onSelectUnit,
  onUnitsSelectionChange,
  onUnitsHidden,
}: UnitsDrawerProps) => {
  const [units, setUnits] = useState<MapUnitItem[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadUnits = async (searchValue = '') => {
    try {
      setIsLoading(true)
      setError('')

      const response = await monitorService.getUnitsLive(searchValue)
      setUnits(response)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No fue posible cargar las unidades'

      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    void loadUnits()
  }, [isOpen])

  const selectedUnits = useMemo(() => {
    return units.filter((unit) => selectedIds.includes(unit.id))
  }, [units, selectedIds])

  useEffect(() => {
    if (selectedUnits.length === 0) {
      onUnitsHidden()
      return
    }

    onUnitsSelectionChange(selectedUnits)
  }, [selectedUnits, onUnitsHidden, onUnitsSelectionChange])

  const handleToggleUnit = (unit: MapUnitItem) => {
    setSelectedIds((previousState) =>
      previousState.includes(unit.id)
        ? previousState.filter((id) => id !== unit.id)
        : [...previousState, unit.id],
    )
  }

  const handleClose = () => {
    setSelectedIds([])
    onUnitsHidden()
    onClose()
  }

  if (!isOpen) return null

  return (
    <aside className="absolute right-4 top-4 z-20 flex h-[520px] w-[420px] flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-200 p-4">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void loadUnits(search)
            }
          }}
          placeholder="Unidades..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
        />

        <button
          type="button"
          onClick={() => void loadUnits(search)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Buscar
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Cerrar
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {isLoading && <p className="text-sm text-slate-500">Cargando unidades...</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {!isLoading && !error && units.length === 0 && (
          <p className="text-sm text-slate-500">No se encontraron unidades.</p>
        )}

        <div className="space-y-3">
          {units.map((unit) => {
            const isChecked = selectedIds.includes(unit.id)
            const telemetry = unit.telemetry

            return (
              <div
                key={unit.id}
                className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleUnit(unit)}
                  className="mt-1 h-4 w-4"
                />

                <button
                  type="button"
                  onClick={() => onSelectUnit(unit)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-lg font-semibold text-slate-800">
                      {unit.numero}
                    </p>

                    <span className="text-xs text-slate-400">{unit.imei}</span>
                  </div>

                  <p className="text-sm text-slate-500">
                    {unit.marca} {unit.modelo}
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {telemetry?.status ?? 'Sin telemetría'}
                  </p>

                  <p className="text-xs text-slate-500">
                    {telemetry?.fecha_hora_gps ?? 'Sin fecha de reporte'}
                  </p>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}