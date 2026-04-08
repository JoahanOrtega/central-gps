import { useState } from 'react';
import { useTripDrawer } from '../../hooks/useTripDrawer';
import { formatAppDateTime } from '@/lib/date-time';
import { getTelemetryStatusLabel } from '../../lib/telemetry-status';
import { ChevronDown } from 'lucide-react';
import type { PredefinedRange, RoutePoint } from '../../types/map.types';

interface TripDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRouteSelected: (points: RoutePoint[]) => void;
  onRouteHidden: () => void;
  onRouteVisibilityChange: (visible: boolean) => void;
  onStartEndVisibilityChange: (visible: boolean) => void;
  onDirectionVisibilityChange: (visible: boolean) => void;
}

export const TripDrawer = (props: TripDrawerProps) => {
  const {
    units,
    selectedUnit,
    selectedUnitImei,
    unitSummary,
    visibleTrips,
    selectedTripId,
    currentRoutePoints,
    isLoadingUnits,
    isLoadingRoute,
    error,
    mode,
    setMode,
    search,
    setSearch,
    customRange,
    setCustomRange,
    displayOptions,
    setDisplayOptions,
    extendedSummary,
    formatDuration,
    loadUnits,
    handleUnitChange,
    handleLoadPredefinedRoute,
    handleLoadCustomRange,
    handleLoadTripById,
    handleArchiveTrip,
    handleClose,
  } = useTripDrawer(props);

  const [showPredefinedDropdown, setShowPredefinedDropdown] = useState(false);

  if (!props.isOpen) return null;

  // Renderizado condicional por modo
  const renderContent = () => {
    // Modo 1: Selección de unidad
    if (mode === 'unit_select') {
      return (
        <div className="flex-1 p-4">
          <div className="tarjeta-unidad mb-4 flex h-14 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
            <p className="text-center text-sm text-slate-500">
              <i className="fa fa-arrow-circle-up mr-1" />
              Seleccione Una Unidad
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar unidad..."
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => loadUnits(search)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Buscar
              </button>
            </div>
            <select
              value={selectedUnitImei}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">--seleccione una unidad--</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.imei}>
                  [{unit.numero}] {unit.marca} {unit.modelo}
                </option>
              ))}
            </select>
            {isLoadingUnits && <p className="text-sm text-slate-500">Cargando unidades...</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>
      );
    }

    // Modo 2: Rangos predefinidos
    if (mode === 'predefined' && selectedUnit) {
      return (
        <div className="flex-1 overflow-y-auto p-4">
          {/* Resumen de unidad */}
          <div className="mb-4 rounded-lg border border-slate-200 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-slate-400">Unidad:</span> {selectedUnit.numero}</div>
              <div><span className="text-slate-400">IMEI:</span> {selectedUnit.imei}</div>
              <div className="col-span-2">
                <span className="text-slate-400">Estado:</span>{' '}
                {getTelemetryStatusLabel(selectedUnit.telemetry?.status, selectedUnit.telemetry?.velocidad)}
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Último reporte:</span>{' '}
                {formatAppDateTime(unitSummary?.last_report ?? selectedUnit.telemetry?.fecha_hora_gps)}
              </div>
            </div>
          </div>

          <p className="mb-2 text-sm font-medium">Mostrar Recorrido Previo:</p>
          
          {/* Botones de rango rápido */}
          <div className="mb-4 flex flex-wrap gap-1">
            <button
              onClick={() => handleLoadPredefinedRoute('current')}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Actual
            </button>
            <button
              onClick={() => handleLoadPredefinedRoute('latest')}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Último
            </button>
            <button
              onClick={() => handleLoadPredefinedRoute('today')}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Hoy
            </button>
            <button
              onClick={() => handleLoadPredefinedRoute('yesterday')}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Ayer
            </button>
            <button
              onClick={() => handleLoadPredefinedRoute('day_before_yesterday')}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Antier
            </button>
            
            {/* Dropdown para más opciones */}
            <div className="relative">
              <button
                onClick={() => setShowPredefinedDropdown(!showPredefinedDropdown)}
                className="flex items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              {showPredefinedDropdown && (
                <div className="absolute right-0 z-10 mt-1 w-36 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                  {['30 min', '1 hr', '2 hrs', '4 hrs', '8 hrs', '12 hrs'].map((label) => (
                    <button
                      key={label}
                      className="w-full px-4 py-1.5 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        // Implementar según corresponda
                        notify.info(`Rango ${label} no implementado`);
                        setShowPredefinedDropdown(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="mb-2 text-sm font-medium">Últimos Recorridos:</p>
          <select
            value={selectedTripId}
            onChange={(e) => handleLoadTripById(e.target.value)}
            className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">--seleccione un recorrido--</option>
            {visibleTrips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.label} · {formatDuration(trip.duration_seconds)} · {trip.distance_km.toFixed(2)} km
              </option>
            ))}
          </select>

          <button
            onClick={() => setMode('custom')}
            className="text-sm text-blue-600 hover:underline"
          >
            <i className="flaticon-calendar-with-a-clock-time-tools mr-1" />
            Consultar Otro Rango
          </button>
        </div>
      );
    }

    // Modo 3: Rango personalizado
    if (mode === 'custom' && selectedUnit) {
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-2">
              <div className="col-span-4">
                <label className="text-xs text-slate-500">Fecha Inicial *</label>
                <input
                  type="date"
                  value={customRange.startDate}
                  onChange={(e) => setCustomRange({ ...customRange, startDate: e.target.value })}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="col-span-3">
                <label className="text-xs text-slate-500">Hora Inicial</label>
                <input
                  type="time"
                  value={customRange.startTime}
                  onChange={(e) => setCustomRange({ ...customRange, startTime: e.target.value })}
                  placeholder="opcional"
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              <div className="col-span-4">
                <label className="text-xs text-slate-500">Fecha Final *</label>
                <input
                  type="date"
                  value={customRange.endDate}
                  onChange={(e) => setCustomRange({ ...customRange, endDate: e.target.value })}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="col-span-3">
                <label className="text-xs text-slate-500">Hora Final</label>
                <input
                  type="time"
                  value={customRange.endTime}
                  onChange={(e) => setCustomRange({ ...customRange, endTime: e.target.value })}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setMode('predefined')}
                className="text-sm text-blue-600 hover:underline"
              >
                <i className="flaticon-calendar-with-a-clock-time-tools mr-1" />
                Consultar Rango Predefinido
              </button>
              <button
                onClick={handleLoadCustomRange}
                disabled={!customRange.startDate || !customRange.endDate}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <i className="fa fa-code-branch mr-1" />
                Consultar
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Modo 4: Resumen del recorrido
    if (mode === 'summary' && extendedSummary) {
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <h5 className="mb-3 text-sm font-medium">Resumen de Recorrido</h5>
          
          <div className="mb-4 space-y-2 rounded-lg border border-slate-200 p-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Movimientos</span>
              <span className="font-semibold text-blue-500">{extendedSummary.movementCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Kilómetros</span>
              <span className="font-semibold text-cyan-500">{extendedSummary.distanceKm.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Excesos de Vel.</span>
              <span className="font-semibold text-red-500">{extendedSummary.speedingCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">En Movimiento</span>
              <span className="font-semibold text-emerald-500">{formatDuration(extendedSummary.movingSeconds)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">En Relentí</span>
              <span className="font-semibold text-amber-500">{formatDuration(extendedSummary.idleSeconds)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Apagada</span>
              <span className="font-semibold text-slate-600">{formatDuration(extendedSummary.offSeconds)}</span>
            </div>
          </div>

          {/* Checkboxes de iconos */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">Ver en el mapa</label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={displayOptions.flags}
                  onChange={(e) => setDisplayOptions({ ...displayOptions, flags: e.target.checked })}
                />
                <img src="/images/map/flags.svg" alt="Inicio/Fin" width="18" />
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={displayOptions.arrows}
                  onChange={(e) => setDisplayOptions({ ...displayOptions, arrows: e.target.checked })}
                />
                <img src="/images/map/arrow.svg" alt="Dirección" width="18" />
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={displayOptions.stops}
                  onChange={(e) => setDisplayOptions({ ...displayOptions, stops: e.target.checked })}
                />
                <img src="/images/map/stop.svg" alt="Paradas" width="18" />
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={displayOptions.speeding}
                  onChange={(e) => setDisplayOptions({ ...displayOptions, speeding: e.target.checked })}
                />
                <img src="/images/map/speed-icon.svg" alt="Excesos" width="18" />
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={displayOptions.engine}
                  onChange={(e) => setDisplayOptions({ ...displayOptions, engine: e.target.checked })}
                />
                <img src="/images/map/engine.svg" alt="Motor" width="18" />
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={displayOptions.rfid}
                  onChange={(e) => setDisplayOptions({ ...displayOptions, rfid: e.target.checked })}
                />
                <img src="/images/map/rfid.svg" alt="RFID" width="18" />
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={displayOptions.alerts}
                  onChange={(e) => setDisplayOptions({ ...displayOptions, alerts: e.target.checked })}
                />
                <img src="/images/map/alert.svg" alt="Alertas" width="18" />
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={displayOptions.doors}
                  onChange={(e) => setDisplayOptions({ ...displayOptions, doors: e.target.checked })}
                />
                <img src="/images/map/door.svg" alt="Puertas" width="18" />
              </label>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setMode('predefined')}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              <i className="fa fa-reply mr-1" />
              Cambiar Periodo
            </button>
            <button
              onClick={handleArchiveTrip}
              className="rounded border border-amber-500 px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50"
              title="Archivar Recorrido"
            >
              <i className="fa fa-archive mr-1" />
            </button>
            <button
              onClick={() => notify.info('Usar para ruta no implementado')}
              className="rounded border border-blue-500 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
              title="Usar Para Una Ruta"
            >
              <i className="fa fa-route mr-1" />
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <aside className="absolute inset-x-2 top-2 bottom-2 z-20 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-[450px]">
      {/* Header fijo */}
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-slate-700">Consulta de Recorrido</h3>
          <button
            onClick={handleClose}
            className="rounded-md p-1 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        {/* Tabs de navegación entre modos (solo si no estamos en summary) */}
        {mode !== 'summary' && selectedUnit && (
          <div className="mt-2 flex gap-4 text-sm">
            <button
              onClick={() => setMode('predefined')}
              className={`pb-1 ${mode === 'predefined' ? 'border-b-2 border-emerald-500 font-medium text-emerald-600' : 'text-slate-400'}`}
            >
              Rangos
            </button>
            <button
              onClick={() => setMode('custom')}
              className={`pb-1 ${mode === 'custom' ? 'border-b-2 border-emerald-500 font-medium text-emerald-600' : 'text-slate-400'}`}
            >
              Personalizado
            </button>
          </div>
        )}
      </div>

      {renderContent()}

      {isLoadingRoute && (
        <div className="border-t border-slate-200 p-3 text-center text-sm text-slate-500">
          Cargando recorrido...
        </div>
      )}
    </aside>
  );
};