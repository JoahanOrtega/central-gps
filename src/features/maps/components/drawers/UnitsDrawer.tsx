import { useEffect, useMemo, useState } from "react";

import { monitorService } from "../../services/monitorService"; 
import type { MapUnitItem } from "../../types/map.types";
import {
  formatElapsedTimeFromApiDate,
  formatAppDateTime,
} from "@/lib/date-time";
import {
  getTelemetryMapState,
  getTelemetryStatusLabel,
} from "../../lib/telemetry-status";

interface UnitsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUnit: (unit: MapUnitItem) => void;
  onUnitsSelectionChange: (units: MapUnitItem[]) => void;
  onUnitsHidden: () => void;
}

/**
 * Devuelve la clase visual del punto de estado de la unidad.
 */
const getStatusDotClass = (unit: MapUnitItem) => {
  const mapState = getTelemetryMapState(
    unit.telemetry?.status,
    unit.telemetry?.velocidad,
  );

  if (mapState === "apagado") return "bg-rose-400";
  if (mapState === "movimiento") return "bg-emerald-500";
  if (mapState === "detenido") return "bg-amber-400";

  return "bg-slate-400";
};

/**
 * Drawer lateral de unidades en vivo.
 * Permite buscar, seleccionar varias unidades y enfocar una unidad concreta.
 */
export const UnitsDrawer = ({
  isOpen,
  onClose,
  onSelectUnit,
  onUnitsSelectionChange,
  onUnitsHidden,
}: UnitsDrawerProps) => {
  const [units, setUnits] = useState<MapUnitItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Carga unidades desde el backend.
   */
  const loadUnits = async (searchValue = "") => {
    try {
      setIsLoading(true);
      setError("");

      const response = await monitorService.getUnitsLive(searchValue);
      setUnits(response);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible cargar las unidades";

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void loadUnits();
  }, [isOpen]);

  /**
   * Unidades seleccionadas en el panel.
   */
  const selectedUnits = useMemo(() => {
    return units.filter((unit) => selectedIds.includes(unit.id));
  }, [units, selectedIds]);

  useEffect(() => {
    if (selectedUnits.length === 0) {
      onUnitsHidden();
      return;
    }

    onUnitsSelectionChange(selectedUnits);
  }, [selectedUnits, onUnitsHidden, onUnitsSelectionChange]);

  /**
   * Selecciona o deselecciona una unidad.
   */
  const handleToggleUnit = (unit: MapUnitItem) => {
    setSelectedIds((previousState) =>
      previousState.includes(unit.id)
        ? previousState.filter((id) => id !== unit.id)
        : [...previousState, unit.id],
    );
  };

  /**
   * Cierra el drawer y limpia selección actual.
   */
  const handleClose = () => {
    setSelectedIds([]);
    onUnitsHidden();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <aside className="absolute inset-x-2 top-2 bottom-2 z-20 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-[420px]">
      {/* Encabezado */}
      <div className="border-b border-slate-200 p-3 md:p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void loadUnits(search);
              }
            }}
            placeholder="Unidades..."
            className="w-full flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          />

          <button
            type="button"
            onClick={() => void loadUnits(search)}
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

      {/* Contenido */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
        {isLoading && (
          <p className="text-sm text-slate-500">Cargando unidades...</p>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {!isLoading && !error && units.length === 0 && (
          <p className="text-sm text-slate-500">
            No se encontraron unidades.
          </p>
        )}

        <div className="space-y-3">
          {units.map((unit) => {
            const isChecked = selectedIds.includes(unit.id);

            return (
              <div
                key={unit.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3"
              >
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleUnit(unit)}
                      className="mt-1 h-4 w-4 shrink-0"
                    />

                    <div
                      className={`mt-2 h-3 w-3 shrink-0 rounded-full ${getStatusDotClass(unit)}`}
                    />

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
                            {formatElapsedTimeFromApiDate(
                              unit.telemetry?.fecha_hora_gps,
                            )}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {getTelemetryStatusLabel(
                              unit.telemetry?.status,
                              unit.telemetry?.velocidad,
                            )}
                          </p>

                          <p className="text-sm text-slate-500">
                            {unit.marca} {unit.modelo}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {(unit.telemetry?.velocidad ?? 0) >= 1
                              ? `${unit.telemetry?.velocidad} km/h`
                              : ""}
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