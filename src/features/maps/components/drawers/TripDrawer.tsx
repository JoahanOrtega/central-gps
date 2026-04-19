/**
 * TripDrawer.tsx — Panel lateral de recorridos
 *
 * Diseño de una sola columna scrollable — sin pestañas:
 *   1. Selector de unidad (siempre visible arriba)
 *   2. Tarjeta de estado de la unidad seleccionada
 *   3. Botones de rango + selector de últimos recorridos  ← siempre visible
 *   4. Resumen del recorrido activo (aparece inline cuando hay ruta cargada)
 *   5. Controles de capas del mapa
 *   6. Rango personalizado (expandible con Otro Rango)
 *
 * Leyes UX aplicadas:
 *   Hick's Law          — rangos frecuentes directos, horas en dropdown
 *   Fitts's Law         — "Hoy" y "Ayer" más anchos (acciones más comunes)
 *   Proximity           — resumen inline debajo del selector de recorrido
 *   Visibility          — el usuario nunca pierde de vista los controles de rango
 *   Feedback            — spinner animado, badge en capas activas
 *   Error Prevention    — max/min en fechas, Consultar deshabilitado sin fechas
 *   Progressive Disclosure — rango personalizado oculto hasta pedirlo
 *   Serial Position     — Hoy antes que Ayer antes que Antier
 */
import { useState, useEffect, useCallback } from 'react';
import { useTripDrawer } from '../../hooks/useTripDrawer';
import { formatAppDateTimeShort, todayLocalString } from '@/lib/date-time';
import { getTelemetryStatusMeta, getIgnicion } from '../../lib/telemetry-status';
import { X, ChevronDown, Calendar, RotateCcw, Archive } from 'lucide-react';
import type { RoutePoint, RouteDisplayOptions, CustomRangeParams } from '../../types/map.types';

interface TripDrawerProps {
  onClose: () => void;
  onRouteSelected: (points: RoutePoint[]) => void;
  onRouteHidden: () => void;
  onRouteVisibilityChange: (visible: boolean) => void;
  onStartEndVisibilityChange: (visible: boolean) => void;
  onDirectionVisibilityChange: (visible: boolean) => void;
  // Controla capas individuales: stops, speed, engine, doors, rfid, alerts, arrows, flags
  onLayerChange?: (layer: keyof RouteDisplayOptions, visible: boolean) => void;
}

// ── Capas de eventos ──────────────────────────────────────────────────────────
const LAYERS: Array<{ key: keyof RouteDisplayOptions; src: string; label: string }> = [
  { key: 'flags', src: '/images/app/map_resources/flags.svg', label: 'Inicio/Fin' },
  { key: 'arrows', src: '/images/app/map_resources/arrow.svg', label: 'Dirección' },
  { key: 'stops', src: '/images/app/map_resources/stop.svg', label: 'Paradas' },
  { key: 'engine', src: '/images/app/map_resources/engine.svg', label: 'Motor' },
];

// Botones de rango — Hoy y Ayer resaltados (Fitts + Serial Position)
const QUICK_RANGES = [
  { key: 'current' as const, label: 'Actual', accent: false },
  { key: 'latest' as const, label: 'Último', accent: false },
  { key: 'today' as const, label: 'Hoy', accent: true },
  { key: 'yesterday' as const, label: 'Ayer', accent: true },
  { key: 'day_before_yesterday' as const, label: 'Antier', accent: false },
];

const HOUR_RANGES = [
  { key: 'last_30_min' as const, label: '30 min' },
  { key: 'last_1_hour' as const, label: '1 hr' },
  { key: 'last_2_hours' as const, label: '2 hrs' },
  { key: 'last_4_hours' as const, label: '4 hrs' },
  { key: 'last_8_hours' as const, label: '8 hrs' },
  { key: 'last_12_hours' as const, label: '12 hrs' },
];

// ── Componente ────────────────────────────────────────────────────────────────
export const TripDrawer = ({
  onClose,
  onRouteSelected,
  onRouteHidden,
  onRouteVisibilityChange,
  onStartEndVisibilityChange,
  onDirectionVisibilityChange,
  onLayerChange,
}: TripDrawerProps) => {
  const {
    units, selectedUnit, selectedUnitImei,
    visibleTrips, selectedTripId,
    isLoadingUnits, isLoadingRoute, error,
    setMode,
    search, setSearch,
    customRange, setCustomRange,
    displayOptions, setDisplayOptions,
    extendedSummary, formatDuration,
    loadUnits, handleUnitChange,
    handleLoadPredefinedRoute, handleLoadCustomRange,
    handleLoadTripById, handleArchiveTrip, handleClose,
  } = useTripDrawer({
    onClose,
    onRouteSelected,
    onRouteHidden,
    onRouteVisibilityChange,
    onStartEndVisibilityChange,
    onDirectionVisibilityChange,
  });

  const [showHours, setShowHours] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  // Rastrear el rango activo para feedback visual en los botones
  const [activeRangeKey, setActiveRangeKey] = useState<string | null>(null);

  // Inicializar fechas en UTC-6 correcto
  useEffect(() => {
    const today = todayLocalString();
    setCustomRange((p) => ({ ...p, startDate: today, endDate: today }));
  }, [setCustomRange]);

  // Sincronizar capas con el mapa
  const toggleLayer = useCallback((key: keyof RouteDisplayOptions) => {
    const newValue = !displayOptions[key];
    const next = { ...displayOptions, [key]: newValue };
    setDisplayOptions(next);

    // Usar setLayerVisible directo cuando está disponible (capas independientes)
    if (onLayerChange) {
      onLayerChange(key, newValue);
    } else {
      // Fallback a las 3 props legacy de MapsView
      onRouteVisibilityChange(next.flags || next.arrows);
      onStartEndVisibilityChange(next.flags);
      onDirectionVisibilityChange(next.arrows);
    }
  }, [displayOptions, setDisplayOptions, onLayerChange,
    onRouteVisibilityChange, onStartEndVisibilityChange, onDirectionVisibilityChange]);

  // ── Tarjeta de unidad ─────────────────────────────────────────────────────
  const renderUnitCard = () => {
    if (!selectedUnit) return null;
    const t = selectedUnit.telemetry;
    const meta = getTelemetryStatusMeta(t?.status, t?.velocidad, t?.segundos);
    return (
      <div
        className="mx-3 mb-3 flex items-center gap-3 rounded-xl p-2.5"
        style={{ background: `${meta.fillColor}12`, border: `1px solid ${meta.fillColor}30` }}
      >
        <div
          className="text-xl leading-none select-none"
          style={{
            color: meta.fillColor,
            transform: meta.mapState === 'movimiento' ? `rotate(${t?.grados ?? 0}deg)` : 'none',
            transition: 'transform 0.4s ease',
          }}
        >
          {meta.mapState === 'movimiento' ? '⮝' : '●'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">
            {selectedUnit.numero} — {selectedUnit.marca}
          </p>
          <p className="text-xs" style={{ color: meta.fillColor }}>
            {meta.label}
            {(t?.velocidad ?? 0) >= 1 ? ` · ${Math.round(t!.velocidad!)} km/h` : ''}
          </p>
        </div>
        {t?.fecha_hora_gps && (
          <p className="shrink-0 text-[10px] text-slate-400">
            {formatAppDateTimeShort(t.fecha_hora_gps)}
          </p>
        )}
      </div>
    );
  };

  // ── Resumen inline ────────────────────────────────────────────────────────
  // Aparece debajo del selector de recorridos — sin pestaña separada
  const renderSummaryInline = () => {
    if (!extendedSummary) return null;
    return (
      <div className="mx-3 mb-3 overflow-hidden rounded-xl border border-slate-200">
        {/* Métricas en dos filas — Proximity */}
        <div className="grid grid-cols-3 divide-x divide-slate-200 bg-slate-50">
          {[
            { v: extendedSummary.movementCount, l: 'Viajes', c: '#2563eb' },
            { v: `${extendedSummary.distanceKm.toFixed(1)} km`, l: 'Distancia', c: '#0891b2' },
            { v: extendedSummary.speedingCount, l: 'Excesos', c: '#dc2626' },
          ].map(({ v, l, c }) => (
            <div key={l} className="py-2 text-center">
              <p className="text-base font-bold leading-tight" style={{ color: c }}>{v}</p>
              <p className="text-[10px] text-slate-400">{l}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-200">
          {[
            { v: formatDuration(extendedSummary.movingSeconds), l: 'Movimiento', c: '#16a34a' },
            { v: formatDuration(extendedSummary.idleSeconds), l: 'Relentí', c: '#d97706' },
            { v: formatDuration(extendedSummary.offSeconds), l: 'Apagada', c: '#64748b' },
          ].map(({ v, l, c }) => (
            <div key={l} className="py-2 text-center">
              <p className="text-xs font-semibold" style={{ color: c }}>{v}</p>
              <p className="text-[10px] text-slate-400">{l}</p>
            </div>
          ))}
        </div>

        {/* Capas — checkboxes visibles con etiqueta (no sr-only) */}
        <div className="border-t border-slate-200 p-2.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Ver en el mapa
          </p>
          <div className="flex flex-wrap gap-1.5">
            {LAYERS.map(({ key, src, label }) => {
              const on = displayOptions[key as keyof RouteDisplayOptions];
              return (
                <button
                  key={key}
                  type="button"
                  title={label}
                  onClick={() => toggleLayer(key as keyof RouteDisplayOptions)}
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all ${on
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-500'
                    }`}
                >
                  <img
                    src={src}
                    alt={label}
                    width={16}
                    height={16}
                    className={`shrink-0 transition-opacity ${on ? 'opacity-100' : 'opacity-40'}`}
                    style={{ display: 'block' }}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2">
          <button
            type="button"
            onClick={() => { setMode('predefined'); }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Cambiar periodo
          </button>
          <button
            type="button"
            onClick={handleArchiveTrip}
            className="flex items-center gap-1.5 rounded-md border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50"
          >
            <Archive className="h-3.5 w-3.5" />
            Archivar
          </button>
        </div>
      </div>
    );
  };

  // ── Rango personalizado expandible ────────────────────────────────────────
  const renderCustomRange = () => (
    <div className="mx-3 mb-3 overflow-hidden rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => setShowCustom((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-emerald-500" />
          Consultar Otro Rango
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showCustom ? 'rotate-180' : ''}`}
        />
      </button>

      {showCustom && (
        <div className="border-t border-slate-200 p-3">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { label: 'Fecha Inicial *', field: 'startDate' as const, type: 'date', max: customRange.endDate },
                { label: 'Hora Inicial', field: 'startTime' as const, type: 'time', max: undefined },
                { label: 'Fecha Final *', field: 'endDate' as const, type: 'date', min: customRange.startDate },
                { label: 'Hora Final', field: 'endTime' as const, type: 'time', min: undefined },
              ] satisfies Array<{
                label: string;
                field: keyof CustomRangeParams;
                type: string;
                max?: string;
                min?: string;
              }>
            ).map(({ label, field, type, max, min }) => (
              <div key={field}>
                <label className="mb-1 block text-[10px] font-medium text-slate-500">
                  {label}
                </label>
                <input
                  type={type}
                  step={type === 'time' ? 1 : undefined}
                  value={customRange[field] ?? ''}
                  max={max}
                  min={min}
                  onChange={(e) =>
                    setCustomRange({ ...customRange, [field]: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-emerald-400"
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => { void handleLoadCustomRange(); setShowCustom(false); }}
              disabled={!customRange.startDate || !customRange.endDate || isLoadingRoute}
              className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Consultar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <aside className="absolute inset-y-2 right-2 z-20 flex w-[340px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-3">
        <h2 className="text-sm font-semibold text-slate-800">Recorridos</h2>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Selector de unidad */}
      <div className="shrink-0 border-b border-slate-100 px-3 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void loadUnits(search)}
            placeholder="Buscar unidad…"
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={() => void loadUnits(search)}
            className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            Buscar
          </button>
        </div>
        <select
          value={selectedUnitImei}
          onChange={(e) => { setActiveRangeKey(null); void handleUnitChange(e.target.value); }}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400"
        >
          <option value="">— seleccione una unidad —</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.imei}>
              {getIgnicion(unit.telemetry?.status) === 1 ? '●' : '○'}{' '}
              [{unit.numero}] {unit.marca} {unit.modelo}
            </option>
          ))}
        </select>
        {isLoadingUnits && (
          <p className="mt-1 animate-pulse text-xs text-slate-400">Cargando unidades…</p>
        )}
      </div>

      {/* Contenido scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto py-3">

        {/* Sin unidad seleccionada */}
        {!selectedUnit && !isLoadingUnits && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            Selecciona una unidad para ver sus recorridos.
          </p>
        )}

        {selectedUnit && (
          <>
            {/* Tarjeta de estado */}
            {renderUnitCard()}

            {/* Rangos rápidos */}
            <div className="px-3 mb-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Recorrido Previo
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_RANGES.map(({ key, label, accent }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setActiveRangeKey(key); void handleLoadPredefinedRoute(key); }}
                    disabled={isLoadingRoute}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${activeRangeKey === key
                        ? 'border-emerald-500 bg-emerald-600 text-white'
                        : accent
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {label}
                  </button>
                ))}
                {/* Dropdown de horas */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowHours((v) => !v)}
                    disabled={isLoadingRoute}
                    className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                    title="Por horas"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {showHours && (
                    <div className="absolute left-0 top-full z-30 mt-1 w-24 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      {HOUR_RANGES.map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => { void handleLoadPredefinedRoute(key); setShowHours(false); }}
                          className="w-full px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Últimos recorridos */}
            {visibleTrips.length > 0 && (
              <div className="px-3 mb-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Últimos Recorridos
                </p>
                <select
                  value={selectedTripId}
                  onChange={(e) => void handleLoadTripById(e.target.value)}
                  disabled={isLoadingRoute}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-40"
                >
                  <option value="">— seleccione —</option>
                  {visibleTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.label} · {formatDuration(trip.duration_seconds)} · {trip.distance_km.toFixed(1)} km
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Resumen inline — aparece al cargar una ruta */}
            {renderSummaryInline()}

            {/* Rango personalizado expandible */}
            {renderCustomRange()}
          </>
        )}

        {error && (
          <p className="px-4 py-4 text-center text-sm text-red-500">{error}</p>
        )}
      </div>

      {/* Loader */}
      {isLoadingRoute && (
        <div className="shrink-0 flex items-center justify-center gap-2 border-t border-slate-200 bg-emerald-50 py-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-xs font-medium text-emerald-700">Cargando recorrido…</span>
        </div>
      )}
    </aside>
  );
};