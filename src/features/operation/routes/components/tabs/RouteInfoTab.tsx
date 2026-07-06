import { useQuery } from "@tanstack/react-query";
import type { TipoRuta } from "../../types/route.types"
import { clientService } from "@/features/catalogs/clients/services/clientService";
import type { ClientItem } from "@/features/catalogs/clients/types/client.types";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { queryKeys } from "@/lib/query-keys";
import { Field, inputClass } from "@/components/shared/form-helpers";

// Lo que el tab necesita leer y escribir del formulario padre
interface RouteInfoForm {
  clave: string;
  nombre: string;
  tipo: TipoRuta | "";
  id_cliente: number | null;
  observaciones: string;
  tieneVuelta: boolean;
}

interface RouteInfoTabProps {
  form: RouteInfoForm;
  onChange: (patch: Partial<RouteInfoForm>) => void;
  // Errores de validación por campo. Si no se pasa, no hay errores.
  fieldErrors?: { nombre?: string; tipo?: string };
}

// Opciones del select de tipo de ruta — fiel al sistema v2.5
const TIPO_OPCIONES: { value: TipoRuta; label: string }[] = [
  { value: "transporte_personal", label: "Transporte de Personal" },
  { value: "transporte_publico", label: "Transporte Público Colectivo" },
  { value: "reparto", label: "Reparto (Última milla)" },
  { value: "viaje_especial", label: "Viaje Especial" },
];

export const RouteInfoTab = ({ form, onChange, fieldErrors }: RouteInfoTabProps) => {
  const { idEmpresa } = useEmpresaActiva();

  // Clientes para el select "Cliente asignado"
  const { data: clients = [] } = useQuery<ClientItem[]>({
    queryKey: queryKeys.catalogs.clients(idEmpresa),
    queryFn: () => clientService.list("", idEmpresa),
    enabled: !!idEmpresa,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
      <section className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Clave">
            <input
              value={form.clave}
              onChange={(e) => onChange({ clave: e.target.value })}
              maxLength={50}
              placeholder="Ej. MX01"
              className={inputClass}
            />
          </Field>

          <Field label="Nombre *">
            <input
              value={form.nombre}
              onChange={(e) => onChange({ nombre: e.target.value })}
              maxLength={500}
              placeholder="Nombre de la ruta"
              aria-invalid={Boolean(fieldErrors?.nombre)}
              className={`${inputClass} ${fieldErrors?.nombre ? "border-rose-300 focus:border-rose-400" : ""}`}
            />
            {fieldErrors?.nombre && (
              <p role="alert" className="mt-1 text-xs text-rose-600">{fieldErrors.nombre}</p>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tipo de ruta *">
            <select
              value={form.tipo}
              onChange={(e) => onChange({ tipo: e.target.value as TipoRuta })}
              aria-invalid={Boolean(fieldErrors?.tipo)}
              className={`${inputClass} ${fieldErrors?.tipo ? "border-rose-300 focus:border-rose-400" : ""}`}
            >
              <option value="">-- seleccione --</option>
              {TIPO_OPCIONES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {fieldErrors?.tipo && (
              <p role="alert" className="mt-1 text-xs text-rose-600">{fieldErrors.tipo}</p>
            )}
          </Field>

          <Field label="Cliente asignado">
            <select
              value={form.id_cliente ?? ""}
              onChange={(e) =>
                onChange({ id_cliente: e.target.value ? Number(e.target.value) : null })
              }
              className={inputClass}
            >
              <option value="">-- seleccione --</option>
              {clients.map((c) => (
                <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Toggle: la ruta tiene vuelta (segunda logística) */}
        <Field label="Sentido de la ruta">
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.tieneVuelta}
              onChange={(e) => onChange({ tieneVuelta: e.target.checked })}
              className="h-4 w-4"
            />
            Esta ruta tiene logística de salida
          </label>
          <p className="mt-1 text-xs text-slate-400">
            Actívalo si la ruta hace entrada y salida. Aparecerá una pestaña extra para la logística de salida.
          </p>
        </Field>

        <Field label="Observaciones">
          <textarea
            value={form.observaciones}
            onChange={(e) => onChange({ observaciones: e.target.value })}
            rows={4}
            placeholder="Notas adicionales sobre la ruta..."
            className="min-h-24 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </Field>
      </section>

      {/* Resumen lateral */}
      <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5">
        <h3 className="text-sm font-semibold text-slate-700">Resumen de la ruta</h3>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <p><span className="font-medium text-slate-700">Clave:</span> {form.clave || "---"}</p>
          <p><span className="font-medium text-slate-700">Nombre:</span> {form.nombre || "---"}</p>
          <p>
            <span className="font-medium text-slate-700">Tipo:</span>{" "}
            {TIPO_OPCIONES.find((o) => o.value === form.tipo)?.label || "---"}
          </p>
          <p>
            <span className="font-medium text-slate-700">Sentido:</span>{" "}
            {form.tieneVuelta ? "Ida y vuelta" : "Solo ida"}
          </p>
        </div>
      </aside>
    </div>
  );
};