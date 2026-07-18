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

const formatFechaHora = (fechaStr: string) => {
  if (!fechaStr) return { date: "---", time: "" };
  
  if (fechaStr.includes("T")) {
    const [date, rest] = fechaStr.split("T");
    const time = rest ? rest.slice(0, 5) : "";
    return { date, time };
  }
  
  if (fechaStr.includes(" ")) {
    const [date, time] = fechaStr.split(" ");
    return { date, time: time ? time.slice(0, 5) : "" };
  }
  
  return { date: fechaStr, time: "" };
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
            <th className="px-4 py-3 font-semibold text-center w-12 min-w-[48px] sticky top-0 bg-slate-50 z-20">#</th>
            <th className="px-4 py-3 font-semibold text-center w-[120px] min-w-[120px] sticky top-0 bg-slate-50 z-20">Fecha Carga</th>
            <th className="px-4 py-3 font-semibold text-center w-[140px] min-w-[140px] max-w-[140px] sticky top-0 bg-slate-50 z-20">Gasolinera</th>
            <th className="px-4 py-3 font-semibold text-center w-[130px] min-w-[130px] max-w-[130px] sticky top-0 bg-slate-50 z-20">Grupo de unidades</th>
            <th className="px-4 py-3 font-semibold text-center w-[110px] min-w-[110px] sticky top-0 bg-slate-50 z-20">Folio</th>
            <th className="px-4 py-3 font-semibold text-center w-[130px] min-w-[130px] max-w-[130px] sticky top-0 bg-slate-50 z-20">Unidad</th>
            <th className="px-4 py-3 font-semibold text-center w-[100px] min-w-[100px] sticky top-0 bg-slate-50 z-20">Litros</th>
            <th className="px-4 py-3 font-semibold text-center w-[110px] min-w-[110px] sticky top-0 bg-slate-50 z-20">Costo/Litro</th>
            <th className="px-4 py-3 font-semibold text-center w-[120px] min-w-[120px] sticky top-0 bg-slate-50 z-20">Importe</th>
            <th className="px-4 py-3 font-semibold text-center w-[100px] min-w-[100px] sticky top-0 bg-slate-50 z-20">Kms GPS</th>
            <th className="px-4 py-3 font-semibold text-center w-[100px] min-w-[100px] sticky top-0 bg-slate-50 z-20">Rend GPS</th>
            <th className="px-4 py-3 font-semibold text-center w-[110px] min-w-[110px] sticky top-0 bg-slate-50 z-20">Kms Odo.</th>
            <th className="px-4 py-3 font-semibold text-center w-[100px] min-w-[100px] sticky top-0 bg-slate-50 z-20">Rend Odo.</th>
            <th className="px-4 py-3 font-semibold text-center w-[100px] min-w-[100px] sticky top-0 bg-slate-50 z-20">Kms Vacío</th>
            <th className="px-4 py-3 font-semibold text-center w-[90px] min-w-[90px] sticky top-0 bg-slate-50 z-20">% Vacío</th>
            <th className="px-4 py-3 font-semibold text-center w-[110px] min-w-[110px] sticky top-0 bg-slate-50 z-20">Rend Óptimo</th>
            <th className="px-4 py-3 font-semibold text-center sticky right-0 top-0 bg-slate-50 shadow-[-4px_0_10px_rgba(0,0,0,0.02)] w-24 min-w-[96px] z-30">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((item, index) => {
            const menuItems = [
              canEdit && { id: "edit", label: "Editar", icon: Pencil, onClick: () => onEdit?.(item.id_combustible) },
              canDelete && { id: "delete", label: "Eliminar", icon: Trash2, variant: "destructive", onClick: () => onDelete?.(item) },
            ].filter(Boolean) as unknown as React.ComponentProps<typeof KebabMenu>["items"];

            const { date, time } = formatFechaHora(item.fecha_carga);

            return (
              <tr key={item.id_combustible} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 text-center font-medium text-slate-400 whitespace-nowrap">{index + 1}</td>
                <td className="px-4 py-3 text-center text-slate-900 whitespace-nowrap">
                  <div className="flex flex-col items-center justify-center">
                    <span className="font-medium text-slate-900">{date}</span>
                    {time && <span className="text-[11px] text-slate-400 font-normal">{time} hrs</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-medium w-[140px] min-w-[140px] max-w-[140px]">
                  <div className="w-full break-words whitespace-normal leading-tight mx-auto text-center">{item.gasolinera || "---"}</div>
                </td>
                <td className="px-4 py-3 text-center text-slate-600 w-[130px] min-w-[130px] max-w-[130px]">
                  <div className="w-full break-words whitespace-normal leading-tight mx-auto text-center">{item.grupo_unidades || "---"}</div>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium border border-slate-200">{item.folio}</span>
                </td>
                <td className="px-4 py-3 text-center font-semibold text-slate-800 w-[130px] min-w-[130px] max-w-[130px]">
                  <div className="w-full break-words whitespace-normal leading-tight mx-auto text-center">{item.unidad}</div>
                </td>
                
                <td className="px-4 py-3 text-center font-medium whitespace-nowrap">{formatNumber(item.litros, false, 3)}</td>
                <td className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">{formatNumber(item.costo_litro, true, 2)}</td>
                <td className="px-4 py-3 text-center font-semibold text-slate-900 whitespace-nowrap">{formatNumber(item.importe, true, 2)}</td>
                
                <td className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">{formatNumber(item.kms_gps, false, 2)}</td>
                <td className="px-4 py-3 text-center text-blue-600 font-medium whitespace-nowrap">{formatNumber(item.rend_gps, false, 2)}</td>
                <td className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">{formatNumber(item.kms_recorridos, false, 2)}</td>
                <td className="px-4 py-3 text-center text-blue-600 font-medium whitespace-nowrap">{formatNumber(item.rend_odo, false, 2)}</td>
                <td className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">{formatNumber(item.kms_vacio, false, 2)}</td>
                <td className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">{formatNumber(item.porc_vacio, false, 2)}%</td>
                <td className="px-4 py-3 text-center text-emerald-600 font-medium whitespace-nowrap">{formatNumber(item.rend_establecido, false, 2)}</td>
                
                <td className="px-4 py-3 text-center sticky right-0 bg-white shadow-[-4px_0_10px_rgba(0,0,0,0.02)] whitespace-nowrap z-10 hover:z-40 focus-within:z-40">
                  {menuItems.length > 0 && <KebabMenu items={menuItems} entityName={`Folio ${item.folio}`} />}
                </td>
              </tr>
            );
          })}
        </tbody>

        {items.length > 0 && (
          <tfoot className="border-t-2 border-slate-300">
            <tr className="bg-slate-100 font-bold text-slate-800 whitespace-nowrap">
              <td colSpan={6} className="px-4 py-3 text-center text-xs uppercase tracking-wider text-slate-500 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">
                Totales
              </td>
              <td className="px-4 py-3 text-center font-bold text-slate-900 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">{formatNumber(sumLitros, false, 3)}</td>
              <td className="px-4 py-3 text-center text-slate-400 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">---</td>
              <td className="px-4 py-3 text-center font-bold text-slate-900 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">{formatNumber(sumImporte, true, 2)}</td>
              <td className="px-4 py-3 text-center text-slate-800 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">{formatNumber(sumKmsGps, false, 2)}</td>
              <td className="px-4 py-3 text-center text-slate-400 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">---</td>
              <td className="px-4 py-3 text-center text-slate-800 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">{formatNumber(sumKmsOdo, false, 2)}</td>
              <td className="px-4 py-3 text-center text-slate-400 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">---</td>
              <td className="px-4 py-3 text-center text-slate-800 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">{formatNumber(sumKmsVacio, false, 2)}</td>
              <td className="px-4 py-3 text-center text-slate-400 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">---</td>
              <td className="px-4 py-3 text-center text-slate-400 bg-slate-100 sticky bottom-[42px] z-20 shadow-[inset_0_-1px_0_#e2e8f0]">---</td>
              <td className="px-4 py-3 sticky right-0 bottom-[42px] bg-slate-100 shadow-[-4px_0_10px_rgba(0,0,0,0.02),_inset_0_-1px_0_#e2e8f0] z-30"></td>
            </tr>

            <tr className="bg-slate-50 font-bold text-slate-700 whitespace-nowrap">
              <td colSpan={6} className="px-4 py-3 text-center text-xs uppercase tracking-wider text-slate-500 bg-slate-50 sticky bottom-0 z-20">
                Promedios
              </td>
              <td className="px-4 py-3 text-center text-slate-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgLitros, false, 3)}</td>
              <td className="px-4 py-3 text-center text-slate-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgCostoLitro, true, 2)}</td>
              <td className="px-4 py-3 text-center text-slate-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgImporte, true, 2)}</td>
              <td className="px-4 py-3 text-center text-slate-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgKmsGps, false, 2)}</td>
              <td className="px-4 py-3 text-center text-blue-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgRendGps, false, 2)}</td>
              <td className="px-4 py-3 text-center text-slate-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgKmsOdo, false, 2)}</td>
              <td className="px-4 py-3 text-center text-blue-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgRendOdo, false, 2)}</td>
              <td className="px-4 py-3 text-center text-slate-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgKmsVacio, false, 2)}</td>
              <td className="px-4 py-3 text-center text-slate-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgPorcVacio, false, 2)}%</td>
              <td className="px-4 py-3 text-center text-emerald-600 bg-slate-50 sticky bottom-0 z-20">{formatNumber(avgRendOptimo, false, 2)}</td>
              <td className="px-4 py-3 sticky right-0 bottom-0 bg-slate-50 shadow-[-4px_0_10px_rgba(0,0,0,0.02)] z-30"></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};