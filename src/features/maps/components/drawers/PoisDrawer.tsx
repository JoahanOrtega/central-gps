/**
 * PoisDrawer.tsx — Panel lateral de Puntos de Interés
 *
 * Leyes UX aplicadas:
 *   Chunking        → POIs agrupados en acordeón por grupo
 *   Recognition     → ícono diferente por tipo_poi (📍 punto / ⬡ polígono)
 *   Fitts's Law     → clic en toda la fila enfoca en mapa
 *   Error Prevention→ checkbox de grupo con indeterminate
 *   Visibility      → contador total y seleccionados en header
 *   Feedback        → fila con bg distinto cuando seleccionada
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import type { MapPoiItem } from '../../types/map.types';
import { usePoisDrawer } from '../../hooks/usePoisDrawer';
import { DrawerSkeletonList } from '@/components/shared/SkeletonCard';

interface PoisDrawerProps {
  onClose: () => void;
  onSelectPoi: (poi: MapPoiItem) => void;
  onPoisSelectionChange: (pois: MapPoiItem[]) => void;
  onPoisHidden: () => void;
}

interface PoiGroup { nombre: string; pois: MapPoiItem[]; }

const groupPois = (pois: (MapPoiItem & { grupo?: string })[]): PoiGroup[] => {
  const map = new Map<string, MapPoiItem[]>();
  pois.forEach((p) => {
    const g = p.grupo ?? 'Sin Grupo';
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(p);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([nombre, pois]) => ({ nombre, pois }));
};

// ── Ícono por tipo_poi ────────────────────────────────────────────────────────
const PoiIcon = ({ tipo }: { tipo: number }) => (
  <span
    title={tipo === 2 ? 'Geocerca / Polígono' : 'Punto de interés'}
    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-sm ${tipo === 2 ? 'bg-violet-100 text-violet-600' : 'bg-orange-100 text-orange-500'
      }`}
  >
    {tipo === 2 ? '⬡' : '📍'}
  </span>
);

// ── Fila de un POI ────────────────────────────────────────────────────────────
const PoiRow = ({
  poi, isChecked, onToggle, onFocus,
}: {
  poi: MapPoiItem; isChecked: boolean;
  onToggle: (p: MapPoiItem) => void;
  onFocus: (p: MapPoiItem) => void;
}) => (
  <div
    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${isChecked ? 'bg-violet-50' : 'hover:bg-slate-50'
      }`}
    onClick={() => onFocus(poi)}
  >
    <div onClick={(e) => { e.stopPropagation(); onToggle(poi); }}>
      <input
        type="checkbox"
        checked={isChecked}
        onChange={() => { }}
        className="h-4 w-4 cursor-pointer accent-violet-500"
      />
    </div>
    <PoiIcon tipo={poi.tipo_poi} />
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs font-medium text-slate-700">{poi.nombre || 'Sin nombre'}</p>
      {poi.direccion && (
        <p className="truncate text-[10px] text-slate-400">{poi.direccion}</p>
      )}
    </div>
  </div>
);

// ── Grupo colapsable ──────────────────────────────────────────────────────────
const PoiGroupSection = ({
  group, selectedPoiIds, onToggle, onFocus, defaultOpen,
}: {
  group: PoiGroup; selectedPoiIds: number[];
  onToggle: (p: MapPoiItem) => void;
  onFocus: (p: MapPoiItem) => void;
  defaultOpen: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const checked = group.pois.filter((p) => selectedPoiIds.includes(p.id_poi)).length;

  const handleGroupToggle = useCallback(() => {
    const allOn = checked === group.pois.length;
    group.pois.forEach((p) => {
      const on = selectedPoiIds.includes(p.id_poi);
      if (allOn ? on : !on) onToggle(p);
    });
  }, [checked, group.pois, selectedPoiIds, onToggle]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center gap-2 bg-slate-50 px-3 py-2">
        <input
          type="checkbox"
          checked={checked === group.pois.length && group.pois.length > 0}
          ref={(el) => {
            if (el) el.indeterminate = checked > 0 && checked < group.pois.length;
          }}
          onChange={handleGroupToggle}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 cursor-pointer accent-violet-500"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
            {group.nombre}
          </span>
          <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            {group.pois.length}
          </span>
          {open
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        </button>
      </div>
      {open && (
        <div className="space-y-0.5 px-2 py-1">
          {group.pois.map((p) => (
            <PoiRow
              key={p.id_poi}
              poi={p}
              isChecked={selectedPoiIds.includes(p.id_poi)}
              onToggle={onToggle}
              onFocus={onFocus}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
export const PoisDrawer = ({
  onClose, onSelectPoi, onPoisSelectionChange, onPoisHidden,
}: PoisDrawerProps) => {
  const {
    pois, filteredPois, selectedPois, selectedPoiIds,
    search, isLoading, error,
    setSearch, loadPois, togglePoi, clearSelection, reset,
  } = usePoisDrawer();

  useEffect(() => {
    clearSelection(); onPoisHidden(); void loadPois();
  }, [clearSelection, loadPois, onPoisHidden]);

  useEffect(() => {
    onPoisSelectionChange(selectedPois);
  }, [selectedPois, onPoisSelectionChange]);

  const handleClose = () => { clearSelection(); onPoisHidden(); reset(); onClose(); };

  const handleToggle = useCallback((poi: MapPoiItem) => {
    const wasOn = selectedPoiIds.includes(poi.id_poi);
    togglePoi(poi);
    if (!wasOn) onSelectPoi(poi);
  }, [selectedPoiIds, togglePoi, onSelectPoi]);

  const handleFocus = useCallback((poi: MapPoiItem) => {
    if (selectedPoiIds.includes(poi.id_poi)) onSelectPoi(poi);
  }, [selectedPoiIds, onSelectPoi]);

  const groups = useMemo((): PoiGroup[] => {
    if (search.trim())
      return [{ nombre: `Resultados (${filteredPois.length})`, pois: filteredPois }];
    return groupPois(filteredPois as (MapPoiItem & { grupo?: string })[]);
  }, [filteredPois, search]);

  return (
    <aside className="absolute inset-x-2 bottom-2 top-2 z-20 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:w-[360px]">

      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Puntos de Interés</h2>
            {!isLoading && pois.length > 0 && (
              <p className="text-[10px] text-slate-400">
                {pois.length} total
                {selectedPoiIds.length > 0 &&
                  ` · ${selectedPoiIds.length} sel.`}
              </p>
            )}
          </div>
          <button type="button" onClick={handleClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, dirección…"
            className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
          />
        </div>
        {selectedPoiIds.length > 0 && (
          <button type="button" onClick={clearSelection}
            className="mt-1 text-xs text-slate-400 hover:text-slate-600">
            Limpiar selección
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading && <DrawerSkeletonList count={6} />}
        {error && !isLoading && (
          <div className="px-3 py-6 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button type="button" onClick={() => void loadPois()}
              className="mt-3 text-sm text-violet-600 hover:underline">
              Reintentar
            </button>
          </div>
        )}
        {!isLoading && !error && filteredPois.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-slate-400">
            {search ? `Sin resultados para "${search}"` : 'No hay puntos de interés.'}
          </p>
        )}
        {!isLoading && !error && groups.length > 0 && (
          <div className="space-y-2">
            {groups.map((g) => (
              <PoiGroupSection
                key={g.nombre}
                group={g}
                selectedPoiIds={selectedPoiIds}
                onToggle={handleToggle}
                onFocus={handleFocus}
                defaultOpen={groups.length === 1}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};