import { Pencil, Trash2, Ban } from "lucide-react";
import { KebabMenu } from "@/components/shared";
import type { AforoItem } from "../types/aforo.types";

interface AforosTableProps {
  items: AforoItem[];
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (idAforo: number) => void;
  onDelete?: (item: AforoItem) => void;
  onBlacklist?: (item: AforoItem) => void;
}

const formatFechaVisual = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "---";
  
  try {
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
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

export const AforosTable = ({
  items,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
  onBlacklist,
}: AforosTableProps) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[850px] text-left text-sm text-slate-700">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 font-semibold w-16 text-center">#</th>
            <th className="px-6 py-4 font-semibold">RFID</th>
            <th className="px-6 py-4 font-semibold">Fecha Asig. / Clave</th>
            <th className="px-6 py-4 font-semibold">Nombre / Departamento</th>
            <th className="px-6 py-4 font-semibold">Ruta</th>
            <th className="px-6 py-4 font-semibold w-20 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((item, index) => {
            const menuItems = [
              canEdit && {
                id: "edit",
                label: "Editar",
                icon: Pencil,
                onClick: () => onEdit?.(item.id_aforo),
              },
              onBlacklist && {
                id: "blacklist",
                label: "Lista Negra",
                icon: Ban,
                variant: "destructive",
                onClick: () => onBlacklist(item),
              },
              canDelete && {
                id: "delete",
                label: "Eliminar",
                icon: Trash2,
                variant: "destructive",
                onClick: () => onDelete?.(item),
              },
            ].filter(Boolean) as unknown as React.ComponentProps<typeof KebabMenu>["items"];

            return (
              <tr key={item.id_aforo} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-center font-medium text-slate-400">{index + 1}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-medium text-slate-800 border border-slate-200">
                    {item.rfid}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-950">{formatFechaVisual(item.fecha_asignacion)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{item.clave || "Sin clave"}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-950 truncate max-w-[200px]">{item.nombre}</div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{item.departamento || "Sin departamento"}</div>
                </td>
                <td className="px-6 py-4 text-slate-600 truncate max-w-[200px]">
                  {item.cliente_ruta || <span className="text-slate-400">Sin ruta</span>}
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  {menuItems.length > 0 && <KebabMenu items={menuItems} entityName={`Aforo ${item.clave || item.nombre}`} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};