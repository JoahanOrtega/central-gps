import { useState } from 'react';
import { useTripDrawer } from '../../hooks/useTripDrawer';
import { formatAppDateTime } from '@/lib/date-time';
import { getTelemetryStatusLabel } from '../../lib/telemetry-status';
import { ChevronDown, X, Calendar, Clock } from 'lucide-react';
import { notify } from '@/stores/notificationStore';
import type { RoutePoint } from '../../types/map.types';

interface TripDrawerProps {
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
  } = useTripDrawer({
    onClose: props.onClose,
    onRouteSelected: props.onRouteSelected,
    onRouteHidden: props.onRouteHidden,
    onRouteVisibilityChange: props.onRouteVisibilityChange,
    onStartEndVisibilityChange: props.onStartEndVisibilityChange,
    onDirectionVisibilityChange: props.onDirectionVisibilityChange,
  });

  const [showPredefinedDropdown, setShowPredefinedDropdown] = useState(false);

  const renderUnitSelector = () => (
    <div className="space-y-3 p-4">
      {/* Buscador y dropdown */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar unidad..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <button
          onClick={() => loadUnits(search)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Buscar
        </button>
      </div>

      <select
        value={selectedUnitImei}
        onChange={(e) => handleUnitChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      >
        <option value="">-seleccione-</option>
        {units.map((unit) => (
          <option key={unit.id} value={unit.imei}>
            [{unit.numero}] {unit.marca} {unit.modelo}
          </option>
        ))}
      </select>

      {isLoadingUnits && <p className="text-sm text-slate-500">Cargando unidades...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );

  const renderContent = () => {
    if (!selectedUnit) return null;

    if (mode === 'predefined') {
      return (
        <div className="space-y-4 p-4 pt-0">
          {/* Resumen de la unidad */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div>
                <span className="text-slate-500">Unidad:</span>{' '}
                <span className="font-medium">{selectedUnit.numero}</span>
              </div>
              <div>
                <span className="text-slate-500">IMEI:</span>{' '}
                <span className="font-medium">{selectedUnit.imei}</span>
              </div>
              <div>
                <span className="text-slate-500">Estado:</span>{' '}
                <span className="font-medium">
                  {getTelemetryStatusLabel(selectedUnit.telemetry?.status, selectedUnit.telemetry?.velocidad)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Último reporte:</span>{' '}
                <span className="font-medium">
                  {formatAppDateTime(unitSummary?.last_report ?? selectedUnit.telemetry?.fecha_hora_gps)}
                </span>
              </div>
            </div>
          </div>

          {/* Mostrar Recorrido Previo */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Mostrar Recorrido Previo:</p>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => handleLoadPredefinedRoute('current')} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Actual</button>
              <button onClick={() => handleLoadPredefinedRoute('latest')} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Último</button>
              <button onClick={() => handleLoadPredefinedRoute('today')} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Hoy</button>
              <button onClick={() => handleLoadPredefinedRoute('yesterday')} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Ayer</button>
              <button onClick={() => handleLoadPredefinedRoute('day_before_yesterday')} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Antier</button>

              {/* Dropdown de opciones adicionales */}
              <div className="relative">
                <button
                  onClick={() => setShowPredefinedDropdown(!showPredefinedDropdown)}
                  className="flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
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
          </div>

          {/* Últimos Recorridos */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Últimos Recorridos:</p>
            <select
              value={selectedTripId}
              onChange={(e) => handleLoadTripById(e.target.value)}
              className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
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
              className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              <Calendar className="mr-1 h-4 w-4" />
              Consultar Otro Rango
            </button>
          </div>
        </div>
      );
    }

    if (mode === 'custom') {
      return (
        <div className="space-y-4 p-4 pt-0">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Fecha Inicial *</label>
                <input
                  type="date"
                  value={customRange.startDate}
                  onChange={(e) => setCustomRange({ ...customRange, startDate: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Hora Inicial</label>
                <input
                  type="time"
                  value={customRange.startTime}
                  onChange={(e) => setCustomRange({ ...customRange, startTime: e.target.value })}
                  placeholder="opcional"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Fecha Final *</label>
                <input
                  type="date"
                  value={customRange.endDate}
                  onChange={(e) => setCustomRange({ ...customRange, endDate: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Hora Final</label>
                <input
                  type="time"
                  value={customRange.endTime}
                  onChange={(e) => setCustomRange({ ...customRange, endTime: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setMode('predefined')}
                className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                <Clock className="mr-1 h-4 w-4" />
                Consultar Rango Predefinido
              </button>
              <button
                onClick={handleLoadCustomRange}
                disabled={!customRange.startDate || !customRange.endDate}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Consultar
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (mode === 'summary' && extendedSummary) {
      return (
        <div className="space-y-4 p-4 pt-0">
          <h5 className="text-sm font-semibold text-slate-800">Resumen de Recorrido</h5>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Movimientos</span>
              <span className="font-semibold text-blue-600">{extendedSummary.movementCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Kilómetros</span>
              <span className="font-semibold text-cyan-600">{extendedSummary.distanceKm.toFixed(2)} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Excesos de Vel.</span>
              <span className="font-semibold text-red-500">{extendedSummary.speedingCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">En Movimiento</span>
              <span className="font-semibold text-emerald-600">{formatDuration(extendedSummary.movingSeconds)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">En Relentí</span>
              <span className="font-semibold text-amber-600">{formatDuration(extendedSummary.idleSeconds)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Apagada</span>
              <span className="font-semibold text-slate-600">{formatDuration(extendedSummary.offSeconds)}</span>
            </div>
          </div>

          {/* Checkboxes de visualización */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Ver en el mapa</label>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'flags', src: '/images/app/map_resources/flags.svg', alt: 'Inicio/Fin' },
                { key: 'arrows', src: '/images/app/map_resources/arrow.svg', alt: 'Dirección' },
                { key: 'stops', src: '/images/app/map_resources/stop.svg', alt: 'Paradas' },
                { key: 'speeding', src: '/images/app/map_resources/speed-icon.svg', alt: 'Excesos' },
                { key: 'engine', src: '/images/app/map_resources/engine.svg', alt: 'Motor' },
              ].map(({ key, src, alt }) => (
                <label key={key} className="flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={displayOptions[key as keyof typeof displayOptions]}
                    onChange={(e) => setDisplayOptions({ ...displayOptions, [key]: e.target.checked })}
                    className="sr-only"
                  />
                  <img
                    src={src}
                    alt={alt}
                    width={20}
                    className={`transition-opacity ${displayOptions[key as keyof typeof displayOptions] ? 'opacity-100' : 'opacity-40'}`}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              onClick={() => setMode('predefined')}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <i className="fa fa-reply mr-1" />
              Cambiar Periodo
            </button>
            <button
              onClick={handleArchiveTrip}
              className="inline-flex items-center rounded-md border border-amber-500 bg-white px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50"
              title="Archivar Recorrido"
            >
              <i className="fa fa-archive mr-1" />
            </button>
            <button
              onClick={() => notify.info('Usar para ruta no implementado')}
              className="inline-flex items-center rounded-md border border-blue-500 bg-white px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
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
    <aside className="absolute inset-y-2 right-2 z-20 flex w-[420px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      {/* Pestañas principales */}
      <div className="border-b border-slate-200 px-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            <button className="border-b-2 border-emerald-500 pb-2 text-sm font-medium text-emerald-600">
              Nuevo
            </button>
            <button className="pb-2 text-sm text-slate-400" disabled>
              Eventos
            </button>
            <button className="pb-2 text-sm text-slate-400" disabled>
              Archivados
            </button>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Selector de unidad siempre visible */}
      {renderUnitSelector()}

      {/* Contenido dinámico debajo */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>

      {/* Loader de ruta */}
      {isLoadingRoute && (
        <div className="border-t border-slate-200 p-3 text-center text-sm text-slate-500">
          Cargando recorrido...
        </div>
      )}
    </aside>
  );
};