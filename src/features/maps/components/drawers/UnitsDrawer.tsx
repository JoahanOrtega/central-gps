/**
 * UnitsDrawer.tsx — Panel lateral de unidades en tiempo real
 *
 * Leyes UX aplicadas:
 *   Chunking            → unidades agrupadas en acordeón por nombre de grupo
 *   Recognition         → ícono de estado visual (flecha/círculo + color por tiempo)
 *   Fitts's Law         → clic en toda la fila enfoca en mapa, no solo en botón pequeño
 *   Serial Position     → encendidas primero dentro de cada grupo
 *   Visibility          → contadores enc./apag. en el header, siempre visibles
 *   Feedback            → dot de color por tiempo de transmisión (verde/amarillo/rojo)
 *   Error Prevention    → checkbox de grupo con estado indeterminate
 *   Doherty Threshold   → skeleton mientras carga, sin bloquear la UI
 *   Aesthetic-Usability → borde de color sutil en tarjeta seleccionada
 */
import { useEffect, useState, useCallback } from 'react';
import { Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useUnitsLive } from '../../hooks/useUnitsLive';
import { formatElapsedTimeFromApiDate } from '@/lib/date-time';
import {
  getTelemetryStatusMeta,
  getIgnicion,
  getSpeedTextColor,
  UNIT_COLORS,
} from '../../lib/telemetry-status';
import { DrawerSkeletonList } from '@/components/shared/SkeletonCard';
import type { MapUnitItem } from '../../types/map.types';

// ── Props ─────────────────────────────────────────────────────────────────────
interface UnitsDrawerProps {
  onClose: () => void;
  onSelectUnit: (unit: MapUnitItem) => void;
  onUnitsSelectionChange: (units: MapUnitItem[]) => void;
  onUnitsHidden: () => void;
}

// ── Agrupación de unidades ────────────────────────────────────────────────────
interface UnitGroup { nombre: string; units: MapUnitItem[]; }

const groupUnits = (units: MapUnitItem[]): UnitGroup[] => {
  const map = new Map<string, MapUnitItem[]>();
  units.forEach((u) => {
    const g = (u as MapUnitItem & { grupo?: string }).grupo ?? 'Sin Grupo';
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(u);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([nombre, us]) => ({
      nombre,
      // Serial Position Effect: encendidas primero dentro del grupo
      units: [...us].sort(
        (a, b) => getIgnicion(b.telemetry?.status) - getIgnicion(a.telemetry?.status)
      ),
    }));
};

// ── Ícono de estado fiel al draw.js legacy ────────────────────────────────────
const UnitStatusIcon = ({ unit }: { unit: MapUnitItem }) => {
  const t = unit.telemetry;
  const vel = unit.vel_max;
  const ignicion = getIgnicion(t?.status);
  const speed = t?.velocidad ?? 0;
  const meta = getTelemetryStatusMeta(t?.status, speed, t?.segundos, t?.segundos_sistema, vel);
  const enMov = ignicion === 1 && Math.round(speed) >= 1;
  const speedC = getSpeedTextColor(speed, vel ?? 0);

  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-0.5 select-none">
      <span
        style={{
          color: meta.fillColor, fontSize: '18px', lineHeight: '1',
          transform: enMov ? `rotate(${t?.grados ?? 0}deg)` : 'none',
          transition: 'transform 0.3s ease',
          filter: `drop-shadow(0 1px 2px ${meta.fillColor}60)`,
        }}
        title={meta.label}
      >
        {enMov ? '⮝' : '●'}
      </span>
      <span className="text-[9px] font-semibold leading-none" style={{ color: speedC }}>
        {ignicion === 1
          ? (speed >= 1 ? `${Math.round(speed)} km/h` : 'Relentí')
          : 'Apagada'}
      </span>
      {(t?.door === 1 || t?.inmovilizador === 1 || ((t?.voltaje ?? 11) < 10)) && (
        <div className="flex gap-0.5 text-[9px]">
          {t?.door === 1 && <span title="Puerta">🚪</span>}
          {t?.inmovilizador === 1 && <span title="Inmovilizador">🔒</span>}
          {(t?.voltaje ?? 11) < 10 && <span title="Batería baja">🔋</span>}
        </div>
      )}
    </div>
  );
};

// ── Tarjeta de una unidad ─────────────────────────────────────────────────────
const UnitCard = ({
  unit, isChecked, onToggle, onSelect,
}: {
  unit: MapUnitItem; isChecked: boolean;
  onToggle: (u: MapUnitItem) => void;
  onSelect: (u: MapUnitItem) => void;
}) => {
  const meta = getTelemetryStatusMeta(
    unit.telemetry?.status, unit.telemetry?.velocidad,
    unit.telemetry?.segundos,
  );
  const elapsed = formatElapsedTimeFromApiDate(unit.telemetry?.fecha_hora_gps);
  const numero = (unit.numero ?? '').replace(/^U/i, '');

  return (
    <div
      className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors ${isChecked
          ? 'bg-emerald-50 ring-1 ring-emerald-200'
          : 'hover:bg-slate-50'
        }`}
      onClick={() => onSelect(unit)}
    >
      {/* Checkbox — stopPropagation para no enfocar al marcar */}
      <div onClick={(e) => { e.stopPropagation(); onToggle(unit); }}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => { }}
          className="h-4 w-4 cursor-pointer accent-emerald-500"
        />
      </div>

      <UnitStatusIcon unit={unit} />

      {/* Número + tiempo */}
      <div className="w-10 shrink-0 text-center">
        <p
          className="font-bold leading-none text-slate-700"
          style={{ fontSize: numero.length >= 5 ? '10px' : '13px' }}
        >
          {numero}
        </p>
        <p className="mt-0.5 text-[9px] font-medium leading-none"
          style={{ color: meta.fillColor }}>
          {elapsed}
        </p>
      </div>

      {/* Marca / modelo / operador */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-700">
          {unit.marca} {unit.modelo}
        </p>
        <p className="truncate text-[10px] text-slate-400">
          {(unit as MapUnitItem & { operador?: string }).operador ?? 'Sin operador'}
        </p>
      </div>
    </div>
  );
};

// ── Grupo colapsable ──────────────────────────────────────────────────────────
const UnitGroupSection = ({
  group, selectedIds, onToggle, onSelect, defaultOpen,
}: {
  group: UnitGroup; selectedIds: number[];
  onToggle: (u: MapUnitItem) => void;
  onSelect: (u: MapUnitItem) => void;
  defaultOpen: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const checked = group.units.filter((u) => selectedIds.includes(u.id)).length;

  const handleGroupToggle = useCallback(() => {
    const allOn = checked === group.units.length;
    group.units.forEach((u) => {
      const on = selectedIds.includes(u.id);
      if (allOn ? on : !on) onToggle(u);
    });
  }, [checked, group.units, selectedIds, onToggle]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center gap-2 bg-slate-50 px-3 py-2">
        <input
          type="checkbox"
          checked={checked === group.units.length && group.units.length > 0}
          ref={(el) => {
            if (el) el.indeterminate = checked > 0 && checked < group.units.length;
          }}
          onChange={handleGroupToggle}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 cursor-pointer accent-emerald-500"
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
            {group.units.length}
          </span>
          {open
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        </button>
      </div>
      {open && (
        <div className="space-y-0.5 px-2 py-1">
          {group.units.map((u) => (
            <UnitCard
              key={u.id}
              unit={u}
              isChecked={selectedIds.includes(u.id)}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
export const UnitsDrawer = ({
  onClose, onSelectUnit, onUnitsSelectionChange, onUnitsHidden,
}: UnitsDrawerProps) => {
  const {
    units, selectedIds, selectedUnits, search,
    isLoading, error, setSearch, loadUnits, toggleUnit, clearSelection,
  } = useUnitsLive();

  useEffect(() => { void loadUnits(); }, [loadUnits]);

  useEffect(() => {
    selectedUnits.length === 0
      ? onUnitsHidden()
      : onUnitsSelectionChange(selectedUnits);
  }, [selectedUnits, onUnitsSelectionChange, onUnitsHidden]);

  const handleClose = () => { clearSelection(); onUnitsHidden(); onClose(); };

  const groups = search.trim()
    ? [{ nombre: `Resultados (${units.length})`, units }]
    : groupUnits(units);

  const encendidas = units.filter((u) => getIgnicion(u.telemetry?.status) === 1).length;

  return (
    <aside className="absolute inset-x-2 bottom-2 top-2 z-20 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:w-[380px]">

      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 px-3 pt-3 pb-2">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Unidades</h2>
            {!isLoading && units.length > 0 && (
              <p className="text-[10px]">
                <span className="font-semibold" style={{ color: UNIT_COLORS.VERDE }}>
                  {encendidas} enc.
                </span>
                {' · '}
                <span className="font-semibold" style={{ color: UNIT_COLORS.ROJO }}>
                  {units.length - encendidas} apag.
                </span>
              </p>
            )}
          </div>
          <button type="button" onClick={handleClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Buscador */}
        <div className="relative flex gap-2">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void loadUnits(search)}
            placeholder="Número, marca, operador…"
            className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
          />
          <button type="button" onClick={() => void loadUnits(search)}
            className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
            Buscar
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600">
              {selectedIds.length} seleccionada{selectedIds.length !== 1 ? 's' : ''}
            </span>
            <button type="button" onClick={clearSelection}
              className="text-xs text-slate-400 hover:text-slate-600">
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading && <DrawerSkeletonList count={6} />}
        {error && !isLoading && (
          <div className="px-3 py-6 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button type="button" onClick={() => void loadUnits(search)}
              className="mt-3 text-sm text-emerald-600 hover:underline">
              Reintentar
            </button>
          </div>
        )}
        {!isLoading && !error && units.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-slate-400">
            {search ? `Sin resultados para "${search}"` : 'No hay unidades disponibles.'}
          </p>
        )}
        {!isLoading && !error && groups.length > 0 && (
          <div className="space-y-2">
            {groups.map((g) => (
              <UnitGroupSection
                key={g.nombre}
                group={g}
                selectedIds={selectedIds}
                onToggle={toggleUnit}
                onSelect={onSelectUnit}
                defaultOpen={groups.length === 1}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};