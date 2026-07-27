import { Pencil, Trash2 } from "lucide-react";
import { KebabMenu } from "@/components/shared";
import type { FuelCargaItem } from "../types/fuelCargas.types";

interface FuelCargasTableProps {
  items: FuelCargaItem[];
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (idCombustible: number) => void;
  onDelete?: (item: FuelCargaItem) => void;
}

const formatNumber = (val: number | null | undefined, isCurrency = false, decimals = 2): string => {
  if (val == null || isNaN(val)) return "---";
  const numStr = val.toLocaleString("es-MX", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return isCurrency ? `$${numStr}` : numStr;
};

const formatFechaVisual = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "---";
  try {
    const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr.split(" ")[0];
    const [year, month, day] = datePart.split("-").map(Number);
    if (!year || !month || !day) return dateStr;

    const date = new Date(year, month - 1, day);
    const fechaFormateada = date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short", 
      year: "numeric",
    });

    return fechaFormateada
      .replace(/ de /g, " ")       
      .replace(/\./g, "")          
      .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase()); 
  } catch (error) {
    return dateStr;
  }
};

const extraerHora = (fechaStr: string | null | undefined): string => {
  if (!fechaStr) return "";
  if (fechaStr.includes("T")) {
    const rest = fechaStr.split("T")[1];
    return rest ? rest.slice(0, 5) : "";
  }
  if (fechaStr.includes(" ")) {
    const time = fechaStr.split(" ")[1];
    return time ? time.slice(0, 5) : "";
  }
  return "";
};

export const FuelCargasTable = ({ items, canEdit = false, canDelete = false, onEdit, onDelete }: FuelCargasTableProps) => {
  const getSum = (field: keyof FuelCargaItem): number => {
    return items.reduce((acc, item) => {
      const val = Number(item[field]);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  };

  const getAvg = (field: keyof FuelCargaItem): number => {
    const validItems = items.filter(item => {
      const val = item[field];
      return val !== null && val !== undefined && !isNaN(Number(val));
    });
    if (validItems.length === 0) return 0;
    const sum = validItems.reduce((acc, item) => acc + Number(item[field]), 0);
    return sum / validItems.length;
  };

  const sumLitros = getSum("litros");
  const sumImporte = getSum("importe");
  const sumKmsGps = getSum("kms_gps");
  const sumKmsOdo = getSum("kms_recorridos");
  const sumKmsVacio = getSum("kms_vacio");

  const avgLitros = getAvg("litros");
  const avgCostoLitro = getAvg("costo_litro");
  const avgImporte = getAvg("importe");
  const avgKmsGps = getAvg("kms_gps");
  const avgRendGps = getAvg("rend_gps");
  const avgKmsOdo = getAvg("kms_recorridos");
  const avgRendOdo = getAvg("rend_odo");
  const avgKmsVacio = getAvg("kms_vacio");
  const avgPorcVacio = getAvg("porc_vacio");
  const avgRendOptimo = getAvg("rend_establecido");

  return (
    <div className="w-full h-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm relative min-h-0 flex flex-col">
      <table className="min-w-[1752px] w-full text-center text-sm text-slate-700 table-fixed border-collapse">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200 sticky top-0 z-20">
          <tr className="whitespace-nowrap">
            <th title="Número consecutivo del registro" className="px-4 py-3 font-semibold text-center w-12 min-w-[48px] sticky top-0 bg-slate-50 z-20">#</th>
            <th title="Fecha y hora en la que se realizó la carga de combustible" className="px-4 py-3 font-semibold text-center w-[120px] min-w-[120px] sticky top-0 bg-slate-50 z-20">Fecha Carga</th>
            <th title="Nombre o establecimiento de la gasolinera" className="px-4 py-3 font-semibold text-center w-[140px] min-w-[140px] max-w-[140px] sticky top-0 bg-slate-50 z-20">Gasolinera</th>
            <th title="Grupos logísticos u operacionales al que pertenece la unidad" className="px-4 py-3 font-semibold text-center w-[140px] min-w-[140px] max-w-[140px] sticky top-0 bg-slate-50 z-20">Grupos de unidad</th>
            <th title="Folio único del ticket de carga" className="px-4 py-3 font-semibold text-center w-[110px] min-w-[110px] sticky top-0 bg-slate-50 z-20">Folio</th>
            <th title="Número económico o identificación del vehículo" className="px-4 py-3 font-semibold text-center w-[130px] min-w-[130px] max-w-[130px] sticky top-0 bg-slate-50 z-20">Unidad</th>
            <th title="Cantidad total de litros cargados" className="px-4 py-3 font-semibold text-center w-[100px] min-w-[100px] sticky top-0 bg-slate-50 z-20">Litros</th>
            <th title="Precio cobrado por cada litro de combustible" className="px-4 py-3 font-semibold text-center w-[110px] min-w-[110px] sticky top-0 bg-slate-50 z-20">Costo/Litro</th>
            <th title="Monto total pagado por la carga" className="px-4 py-3 font-semibold text-center w-[120px] min-w-[120px] sticky top-0 bg-slate-50 z-20">Importe</th>
            <th title="Kilómetros recorridos según el sistema de posicionamiento satelital GPS" className="px-4 py-3 font-semibold text-center w-[100px] min-w-[100px] sticky top-0 bg-slate-50 z-20">Kms GPS</th>
            <th title="Rendimiento vehicular calculado en base a Kms GPS sobre los Litros" className="px-4 py-3 font-semibold text-center w-[100px] min-w-[100px] sticky top-0 bg-slate-50 z-20">Rend GPS</th>
            <th title="Kilómetros recorridos calculados por la diferencia del odómetro físico" className="px-4 py-3 font-semibold text-center w-[110px] min-w-[110px] sticky top-0 bg-slate-50 z-20">Kms Odo.</th>
            <th title="Rendimiento vehicular calculado en base a Kms de Odómetro sobre los Litros" className="px-4 py-3 font-semibold text-center w-[100px] min-w-[100px] sticky top-0 bg-slate-50 z-20">Rend Odo.</th>
            <th title="Kilómetros recorridos por la unidad sin llevar carga física" className="px-4 py-3 font-semibold text-center w-[100px] min-w-[100px] sticky top-0 bg-slate-50 z-20">Kms Vacío</th>
            <th title="Porcentaje de kilómetros recorridos en vacío respecto al total" className="px-4 py-3 font-semibold text-center w-[90px] min-w-[90px] sticky top-0 bg-slate-50 z-20">% Vacío</th>
            <th title="Rendimiento óptimo o ideal configurado para esta unidad" className="px-4 py-3 font-semibold text-center w-[110px] min-w-[110px] sticky top-0 bg-slate-50 z-20">Rend Óptimo</th>
            <th title="Acciones de gestión disponibles para el registro" className="px-4 py-3 font-semibold text-center sticky right-0 top-0 bg-slate-50 shadow-[-4px_0_10px_rgba(0,0,0,0.02)] w-24 min-w-[96px] z-30">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((item, index) => {
            const menuItems = [
              canEdit && { id: "edit", label: "Editar", icon: Pencil, onClick: () => onEdit?.(item.id_combustible) },
              canDelete && { id: "delete", label: "Eliminar", icon: Trash2, variant: "destructive", onClick: () => onDelete?.(item) },
            ].filter(Boolean) as unknown as React.ComponentProps<typeof KebabMenu>["items"];

            const hora = extraerHora(item.fecha_carga);

            return (
              <tr key={item.id_combustible} className="hover:bg-slate-50/50 transition-colors">
                <td title="Número de registro" className="px-4 py-3 text-center font-medium text-slate-400 whitespace-nowrap">{index + 1}</td>
                <td title="Fecha y hora de la carga" className="px-4 py-3 text-center text-slate-900 whitespace-nowrap">
                  <div className="flex flex-col items-center justify-center">
                    <span className="font-medium text-slate-900">{formatFechaVisual(item.fecha_carga)}</span>
                    {hora && <span className="text-[11px] text-slate-400 font-normal">{hora} hrs</span>}
                  </div>
                </td>
                <td title={`Gasolinera: ${item.gasolinera || "---"}`} className="px-4 py-3 text-center font-medium w-[140px] min-w-[140px] max-w-[140px]">
                  <div className="w-full break-words whitespace-normal leading-tight mx-auto text-center">{item.gasolinera || "---"}</div>
                </td>
                <td title={`Grupos de unidad: ${item.grupo_unidades || "---"}`} className="px-4 py-3 text-center text-slate-600 w-[130px] min-w-[130px] max-w-[130px]">
                  <div className="w-full break-words whitespace-normal leading-tight mx-auto text-center">{item.grupo_unidades || "---"}</div>
                </td>
                <td title={`Folio: ${item.folio}`} className="px-4 py-3 text-center whitespace-nowrap">
                  <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium border border-slate-200">{item.folio}</span>
                </td>
                <td title={`Unidad vehicular: ${item.unidad}`} className="px-4 py-3 text-center font-semibold text-slate-800 w-[130px] min-w-[130px] max-w-[130px]">
                  <div className="w-full break-words whitespace-normal leading-tight mx-auto text-center">{item.unidad}</div>
                </td>
                
                <td title={`Litros totales cargados: ${formatNumber(item.litros, false, 3)}`} className="px-4 py-3 text-center font-medium whitespace-nowrap">{formatNumber(item.litros, false, 3)}</td>
                <td title={`Costo unitario por litro: ${formatNumber(item.costo_litro, true, 2)}`} className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">{formatNumber(item.costo_litro, true, 2)}</td>
                <td title={`Monto total del importe: ${formatNumber(item.importe, true, 2)}`} className="px-4 py-3 text-center font-semibold text-slate-900 whitespace-nowrap">{formatNumber(item.importe, true, 2)}</td>
                
                <td title={`Total kilómetros por GPS: ${formatNumber(item.kms_gps, false, 2)}`} className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">{formatNumber(item.kms_gps, false, 2)}</td>
                <td title={`Rendimiento promedio por GPS: ${formatNumber(item.rend_gps, false, 2)}`} className="px-4 py-3 text-center text-blue-600 font-medium whitespace-nowrap">{formatNumber(item.rend_gps, false, 2)}</td>
                <td title={`Total kilómetros por Odómetro: ${formatNumber(item.kms_recorridos, false, 2)}`} className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">{formatNumber(item.kms_recorridos, false, 2)}</td>
                <td title={`Rendimiento promedio por Odómetro: ${formatNumber(item.rend_odo, false, 2)}`} className="px-4 py-3 text-center text-blue-600 font-medium whitespace-nowrap">{formatNumber(item.rend_odo, false, 2)}</td>
                <td title={`Kilómetros recorridos en vacío: ${formatNumber(item.kms_vacio, false, 2)}`} className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">{formatNumber(item.kms_vacio, false, 2)}</td>
                <td title={`Porcentaje total de vacío: ${formatNumber(item.porc_vacio, false, 2)}%`} className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">{formatNumber(item.porc_vacio, false, 2)}%</td>
                <td title={`Rendimiento óptimo establecido: ${formatNumber(item.rend_establecido, false, 2)}`} className="px-4 py-3 text-center text-emerald-600 font-medium whitespace-nowrap">{formatNumber(item.rend_establecido, false, 2)}</td>
                
                <td title="Opciones de gestión" className="px-4 py-3 text-center sticky right-0 bg-white shadow-[-4px_0_10px_rgba(0,0,0,0.02)] whitespace-nowrap z-10 hover:z-40 focus-within:z-40">
                  {menuItems.length > 0 && <KebabMenu items={menuItems} entityName={`Folio ${item.folio}`} />}
                </td>
              </tr>
            );
          })}
        </tbody>

        {items.length > 0 && (
          <tfoot className="border-t-2 border-slate-300">
            <tr className="bg-slate-100 font-bold text-slate-800 whitespace-nowrap">
              <td colSpan={6} title="Sumatoria total de las columnas correspondientes" className="px-4 py-3 text-center text-xs uppercase tracking-wider text-slate-500 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">
                Totales
              </td>
              <td title={`Suma total de litros: ${formatNumber(sumLitros, false, 3)}`} className="px-4 py-3 text-center font-bold text-slate-900 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">{formatNumber(sumLitros, false, 3)}</td>
              <td title="No aplica sumatoria para costo por litro" className="px-4 py-3 text-center text-slate-400 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">---</td>
              <td title={`Suma total de importes: ${formatNumber(sumImporte, true, 2)}`} className="px-4 py-3 text-center font-bold text-slate-900 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">{formatNumber(sumImporte, true, 2)}</td>
              <td title={`Suma total de kilómetros GPS: ${formatNumber(sumKmsGps, false, 2)}`} className="px-4 py-3 text-center text-slate-800 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">{formatNumber(sumKmsGps, false, 2)}</td>
              <td title="No aplica sumatoria para rendimiento GPS" className="px-4 py-3 text-center text-slate-400 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">---</td>
              <td title={`Suma total de kilómetros odómetro: ${formatNumber(sumKmsOdo, false, 2)}`} className="px-4 py-3 text-center text-slate-800 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">{formatNumber(sumKmsOdo, false, 2)}</td>
              <td title="No aplica sumatoria para rendimiento odómetro" className="px-4 py-3 text-center text-slate-400 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">---</td>
              <td title={`Suma total de kilómetros en vacío: ${formatNumber(sumKmsVacio, false, 2)}`} className="px-4 py-3 text-center text-slate-800 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">{formatNumber(sumKmsVacio, false, 2)}</td>
              <td title="No aplica sumatoria para porcentaje de vacío" className="px-4 py-3 text-center text-slate-400 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">---</td>
              <td title="No aplica sumatoria para rendimiento óptimo" className="px-4 py-3 text-center text-slate-400 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">---</td>
              <td className="px-4 py-3 sticky right-0 bottom-[42px] bg-slate-100 shadow-[-4px_0_10px_rgba(0,0,0,0.02),_inset_0_-1px_0_#e2e8f0] z-30"></td>
            </tr>

            <tr className="bg-slate-50 font-bold text-slate-700 whitespace-nowrap">
              <td colSpan={6} title="Promedio general de las columnas correspondientes" className="px-4 py-3 text-center text-xs uppercase tracking-wider text-slate-500 bg-slate-50 sticky bottom-0 z-20">
                Promedios
              </td>
              <td title={`Promedio de litros cargados: ${formatNumber(avgLitros, false, 3)}`} className="px-4 py-3 text-center text-slate-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgLitros, false, 3)}</td>
              <td title={`Promedio de costo por litro: ${formatNumber(avgCostoLitro, true, 2)}`} className="px-4 py-3 text-center text-slate-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgCostoLitro, true, 2)}</td>
              <td title={`Promedio de importe pagado: ${formatNumber(avgImporte, true, 2)}`} className="px-4 py-3 text-center text-slate-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgImporte, true, 2)}</td>
              <td title={`Promedio de kilómetros GPS: ${formatNumber(avgKmsGps, false, 2)}`} className="px-4 py-3 text-center text-slate-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgKmsGps, false, 2)}</td>
              <td title={`Promedio de rendimiento GPS: ${formatNumber(avgRendGps, false, 2)}`} className="px-4 py-3 text-center text-blue-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgRendGps, false, 2)}</td>
              <td title={`Promedio de kilómetros odómetro: ${formatNumber(avgKmsOdo, false, 2)}`} className="px-4 py-3 text-center text-slate-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgKmsOdo, false, 2)}</td>
              <td title={`Promedio de rendimiento odómetro: ${formatNumber(avgRendOdo, false, 2)}`} className="px-4 py-3 text-center text-blue-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgRendOdo, false, 2)}</td>
              <td title={`Promedio de kilómetros en vacío: ${formatNumber(avgKmsVacio, false, 2)}`} className="px-4 py-3 text-center text-slate-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgKmsVacio, false, 2)}</td>
              <td title={`Promedio de porcentaje de vacío: ${formatNumber(avgPorcVacio, false, 2)}%`} className="px-4 py-3 text-center text-slate-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgPorcVacio, false, 2)}%</td>
              <td title={`Promedio de rendimiento óptimo: ${formatNumber(avgRendOptimo, false, 2)}`} className="px-4 py-3 text-center text-emerald-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgRendOptimo, false, 2)}</td>
              <td className="px-4 py-3 sticky right-0 bottom-0 bg-slate-50 shadow-[-4px_0_10px_rgba(0,0,0,0.02)] z-30"></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};