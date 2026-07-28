import { useEffect } from "react";
import { BusFront, X, FileImage, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { UnitItem } from "../types/unit.types";
import { unitService } from "../services/unitService";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { resolveUnitImageSrc } from "../lib/unit-image";

export interface UnitGroup {
  id_grupo_unidades: number | string;
  nombre: string;
}

interface UnitDetailsModalProps {
  unit: UnitItem | null;
  groups?: UnitGroup[];
  onClose: () => void;
}

export const UnitDetailsModal = ({
  unit,
  groups = [],
  onClose,
}: UnitDetailsModalProps) => {
  const { idEmpresa } = useEmpresaActiva();

  const { data: detail, isLoading } = useQuery({
    queryKey: ["unitDetail", unit?.id, idEmpresa],
    queryFn: () => (unit?.id ? unitService.getDetail(unit.id, idEmpresa) : null),
    enabled: !!unit?.id && !!idEmpresa,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!unit) return null;

  const numero = detail?.numero || unit.numero;
  const marcaModelo = `${detail?.marca || unit.marca || ""} ${detail?.modelo || unit.modelo || ""}`.trim();
  const anio = detail?.anio || unit.anio || "---";
  const matricula = detail?.matricula || unit.matricula || "---";

  const operador =
    detail?.nombre_operador ||
    (unit.id_operador ? `Operador ${unit.id_operador}` : null);

  const rawGroupIds = detail?.id_grupo_unidades ?? unit.id_grupo_unidades ?? [];
  const unitGroupIds = Array.isArray(rawGroupIds) ? rawGroupIds : [rawGroupIds];

  const assignedGroups = groups
    .filter((g) => unitGroupIds.map(Number).includes(Number(g.id_grupo_unidades)))
    .map((g) => g.nombre);

  const modeloAvl = (detail as Record<string, any> | null)?.modelo_avl || "---";

  const chip = detail?.chip || unit.chip || "---";
  const imei = detail?.imei || unit.imei || "---";
  const imageSrc = resolveUnitImageSrc(detail?.imagen || unit.imagen);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <BusFront className="h-5 w-5" />
            </div>
            <div>
              <h3 id="modal-title" className="text-lg font-semibold text-slate-800">
                Detalles de Unidad
              </h3>
              <p className="text-xs text-slate-500">Información registrada de la unidad</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="text-xs text-blue-600 font-medium animate-pulse">
              Cargando detalles...
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm text-slate-700">
              <div>
                <p className="font-semibold text-slate-500 text-xs">Número</p>
                <p className="mt-1 font-medium text-slate-900">{numero}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-500 text-xs">Marca y Modelo</p>
                <p className="mt-1 font-medium text-slate-900">{marcaModelo || "---"}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-500 text-xs">Grupos de unidades</p>
                <p className="mt-1 text-slate-900">
                  {assignedGroups.length > 0 ? (
                    <span className="font-medium text-slate-900">{assignedGroups.join(", ")}</span>
                  ) : (
                    <span className="text-slate-400 italic text-xs">sin grupos asignados</span>
                  )}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500 text-xs">Año</p>
                <p className="mt-1 font-medium text-slate-900">{anio}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-500 text-xs">Matrícula</p>
                <p className="mt-1 font-medium text-slate-900">{matricula}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-500 text-xs">Operador</p>
                <p className="mt-1 text-slate-900">
                  {operador ? (
                    <span className="font-medium text-slate-900">{operador}</span>
                  ) : (
                    <span className="text-slate-400 italic text-xs">sin operador asignado</span>
                  )}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500 text-xs">Modelo AVL</p>
                <p className="mt-1 font-medium text-slate-900">{modeloAvl}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-500 text-xs">Número de Chip</p>
                <p className="mt-1 font-medium text-slate-900">{chip}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-500 text-xs">Número IMEI/ESN</p>
                <p className="mt-1 font-medium text-slate-900">{imei}</p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-start">
              <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
                {imageSrc ? (
                  <img src={imageSrc} alt={`Unidad ${numero}`} className="h-full w-full object-cover rounded-lg" />
                ) : (
                  <FileImage className="h-12 w-12 text-slate-300" />
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-slate-700">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-amber-900">
                  Funciones avanzadas (Comandos al AVL y Video en Vivo)
                </p>
                <p className="text-amber-800">
                  Los comandos de interacción directa con el equipo AVL (Actualizar, Inmovilizador, Reiniciar equipo, Borrado de memoria y Comandos personalizados) y la transmisión de video en vivo no están disponibles en esta versión de la aplicación web.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-slate-200 px-6 py-3 bg-slate-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};