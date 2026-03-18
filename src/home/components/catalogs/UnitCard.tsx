import type { UnitItem } from "../../types/unit.types"
import { BusFront, MoreHorizontal, FileImage } from "lucide-react"

interface UnitCardProps {
  unit: UnitItem
}

export const UnitCard = ({ unit }: UnitCardProps) => {
  const statusLabel = "Apagada"
  const operatorLabel = unit.id_operador ? `Operador ${unit.id_operador}` : "--- --- ---"

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-3xl font-semibold text-slate-800">{unit.numero}</h3>
          <p className="mt-1 text-lg text-slate-700">
            {unit.marca} {unit.modelo}
          </p>
          <p className="mt-2 text-sm text-slate-500">{statusLabel}</p>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-[120px_1fr_1fr] gap-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-100 bg-slate-50 p-4">
          <FileImage className="h-14 w-14 text-slate-400" />
          <p className="mt-4 text-sm text-slate-500">Operador</p>
          <p className="mt-1 text-sm text-slate-700">{operatorLabel}</p>
        </div>

        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <BusFront className="h-4 w-4 text-slate-400" />
            <span className="font-medium">Tipo</span>
          </div>
          <p>{unit.tipo}</p>

          <p className="font-medium">IMEI AVL</p>
          <p>{unit.imei}</p>
        </div>

        <div className="space-y-3 text-sm text-slate-700">
          <p className="font-medium">Matrícula</p>
          <p>{unit.matricula}</p>

          <p className="font-medium">Chip</p>
          <p>{unit.chip}</p>

          <p className="font-medium">Año</p>
          <p>{unit.anio}</p>
        </div>
      </div>
    </article>
  )
}