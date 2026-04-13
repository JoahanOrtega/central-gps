import { inputClass } from "./new-unit-form.constants"
import type { FieldProps, NewUnitStepProps } from "./new-unit-form.types"

export const NewUnitAdditionalStep = ({
  form,
  onChange,
}: NewUnitStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-700 md:text-2xl">Información Sobre el Combustible</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Tipo de Combustible">
            <select name="tipo_combustible" value={form.tipo_combustible} onChange={onChange} className={inputClass}>
              <option value="">-- --</option>
              <option value="1">Diesel</option>
              <option value="2">Gasolina</option>
              <option value="3">Gas</option>
              <option value="4">Híbrido</option>
              <option value="5">Eléctrico</option>
              <option value="6">Otro</option>
            </select>
          </Field>
          <Field label="Capacidad del Tanque">
            <div className="relative">
              <input name="capacidad_tanque" value={form.capacidad_tanque} onChange={onChange} className={`${inputClass} pr-10`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">l</span>
            </div>
          </Field>
          <Field label="Rendimiento Establecido">
            <div className="relative">
              <input name="rendimiento_establecido" value={form.rendimiento_establecido} onChange={onChange} className={`${inputClass} pr-14`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">km/l</span>
            </div>
          </Field>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-slate-700 md:text-2xl">Información Sobre Aseguradora</h3>
        <div className="mt-4 space-y-4">
          <Field label="Nombre de la Aseguradora">
            <input name="nombre_aseguradora" value={form.nombre_aseguradora} onChange={onChange} className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Telefonos de la Aseguradora">
              <input name="telefono_aseguradora" value={form.telefono_aseguradora} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Numero de poliza de Seguro">
              <input name="no_poliza_seguro" value={form.no_poliza_seguro} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Fecha de Vigencia de la Poliza">
              <input type="date" name="vigencia_poliza_seguro" value={form.vigencia_poliza_seguro} onChange={onChange} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Vigencia de la Verificación">
              <input type="date" name="vigencia_verificacion_vehicular" value={form.vigencia_verificacion_vehicular} onChange={onChange} className={inputClass} />
            </Field>
          </div>
        </div>
      </div>

      {/* Pestaña de temperatura (oculta por ahora) */}
      {/* <div className="mt-6">
  <h3 className="text-xl font-semibold text-slate-700 md:text-2xl">Rango de temperatura válido</h3>
  <div className="mt-4 grid grid-cols-2 gap-4">
    <Field label="Temperatura Mínima">
      <input type="number" name="temp_min" value={form.temp_min} onChange={onChange} className={inputClass} />
    </Field>
    <Field label="Temperatura Máxima">
      <input type="number" name="temp_max" value={form.temp_max} onChange={onChange} className={inputClass} />
    </Field>
  </div>
</div> */}
    </div>
  )
}

const Field = ({ label, children }: FieldProps) => {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-600">{label}</span>
      {children}
    </label>
  )
}