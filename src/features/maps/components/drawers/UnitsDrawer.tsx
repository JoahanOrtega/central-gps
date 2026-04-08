import { useEffect } from 'react';
import { useUnitsLive } from '../../hooks/useUnitsLive';
import { formatElapsedTimeFromApiDate, formatAppDateTime } from '@/lib/date-time';
import { getTelemetryStatusLabel } from '../../lib/telemetry-status';
import { getUnitStatusDotClass } from '../../lib/units-drawer.helpers';
import type { MapUnitItem } from '../../types/map.types';

interface UnitsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUnit: (unit: MapUnitItem) => void;
  onUnitsSelectionChange: (units: MapUnitItem[]) => void;
  onUnitsHidden: () => void;
}

export const UnitsDrawer = ({
  isOpen,
  onClose,
  onSelectUnit,
  onUnitsSelectionChange,
  onUnitsHidden,
}: UnitsDrawerProps) => {
  const {
    units,
    selectedIds,
    selectedUnits,
    search,
    isLoading,
    error,
    setSearch,
    loadUnits,
    toggleUnit,
    clearSelection,
  } = useUnitsLive();

  useEffect(() => {
    if (!isOpen) return;
    void loadUnits();
  }, [isOpen, loadUnits]);

  useEffect(() => {
    if (!isOpen) return;
    if (selectedUnits.length === 0) {
      onUnitsHidden();
    } else {
      onUnitsSelectionChange(selectedUnits);
    }
  }, [selectedUnits, isOpen, onUnitsSelectionChange, onUnitsHidden]);

  const handleClose = () => {
    clearSelection();
    onUnitsHidden();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <aside className="absolute inset-x-2 top-2 bottom-2 z-20 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-[420px]">
      {/* Header igual que antes, pero usando search/loadUnits del hook */}
      <div className="border-b border-slate-200 p-3 md:p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadUnits(search)}
            placeholder="Unidades..."
            className="w-full flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => loadUnits(search)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 md:w-auto"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 md:w-auto"
          >
            Cerrar
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
        {isLoading && <p className="text-sm text-slate-500">Cargando unidades...</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!isLoading && !error && units.length === 0 && (
          <p className="text-sm text-slate-500">No se encontraron unidades.</p>
        )}

        <div className="space-y-3">
          {units.map((unit) => {
            const isChecked = selectedIds.includes(unit.id);
            const statusDotClass = getUnitStatusDotClass(unit);

            return (
              <div
                key={unit.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3"
              >
                {/* Contenido de la tarjeta (sin cambios) */}
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleUnit(unit)}
                      className="mt-1 h-4 w-4 shrink-0"
                    />
                    <div className={`mt-2 h-3 w-3 shrink-0 rounded-full ${statusDotClass}`} />
                    <button
                      type="button"
                      onClick={() => onSelectUnit(unit)}
                      className="min-w-0 text-left"
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="min-w-[48px] text-center">
                          <p className="text-2xl font-semibold leading-none text-slate-600">
                            {unit.numero}
                          </p>
                          <p className="mt-1 text-xs leading-tight text-slate-500">
                            {formatElapsedTimeFromApiDate(unit.telemetry?.fecha_hora_gps)}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {getTelemetryStatusLabel(
                              unit.telemetry?.status,
                              unit.telemetry?.velocidad
                            )}
                          </p>
                          <p className="text-sm text-slate-500">
                            {unit.marca} {unit.modelo}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {(unit.telemetry?.velocidad ?? 0) >= 1
                              ? `${unit.telemetry?.velocidad} km/h`
                              : ''}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatAppDateTime(unit.telemetry?.fecha_hora_gps)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};