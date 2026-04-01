import { inputClass } from "./new-unit-form.constants"
import type {
  FieldProps,
  NewUnitStepProps,
  SelectFieldProps,
} from "./new-unit-form.types"

export const NewUnitGeneralStep = ({
  form,
  onChange,
}: NewUnitStepProps) => {
  return (
    <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[minmax(0,1.3fr)_320px]">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Numero *">
            <input
              name="numero"
              value={form.numero}
              onChange={onChange}
              className={inputClass}
            />
          </Field>

          <Field label="Marca *">
            <input
              name="marca"
              value={form.marca}
              onChange={onChange}
              className={inputClass}
            />
          </Field>

          <Field label="Modelo *">
            <input
              name="modelo"
              value={form.modelo}
              onChange={onChange}
              className={inputClass}
            />
          </Field>

          <Field label="Año *">
            <input
              name="anio"
              value={form.anio}
              onChange={onChange}
              className={inputClass}
            />
          </Field>

          <Field label="No. Serie">
            <input
              name="no_serie"
              value={form.no_serie}
              onChange={onChange}
              className={inputClass}
            />
          </Field>

          <Field label="Matrícula *">
            <input
              name="matricula"
              value={form.matricula}
              onChange={onChange}
              className={inputClass}
            />
          </Field>

          <Field label="Tipo *">
            <select
              name="tipo"
              value={form.tipo}
              onChange={onChange}
              className={inputClass}
            >
              <option value="">- - -</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </Field>

          <Field label="Odometro *">
            <input
              name="odometro_inicial"
              value={form.odometro_inicial}
              onChange={onChange}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Operador">
            <select
              name="id_operador"
              value={form.id_operador ?? ""}
              onChange={onChange}
              className={inputClass}
            >
              <option value="">-seleccione-</option>
            </select>
          </Field>

          <Field label="Fecha de Instalación *">
            <input
              type="date"
              name="fecha_instalacion"
              value={form.fecha_instalacion}
              onChange={onChange}
              className={inputClass}
            />
          </Field>
        </div>

        <div>
          <h3 className="mb-4 text-xl font-semibold text-slate-700 md:text-2xl">
            Equipo Instalado
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Modelo AVL Instalado">
              <select
                name="id_modelo_avl"
                value={form.id_modelo_avl ?? ""}
                onChange={onChange}
                className={inputClass}
              >
                <option value="">-seleccione-</option>
              </select>
            </Field>

            <Field label="Fecha Instalación *">
              <input
                type="date"
                name="fecha_instalacion"
                value={form.fecha_instalacion}
                onChange={onChange}
                className={inputClass}
              />
            </Field>

            <Field label="Numero Imei del AVL *">
              <input
                name="imei"
                value={form.imei}
                onChange={onChange}
                className={inputClass}
              />
            </Field>

            <Field label="Numero de Chip *">
              <input
                name="chip"
                value={form.chip}
                onChange={onChange}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-5">
            <p className="mb-3 text-base text-slate-600 md:text-lg">
              Periféricos Instalados
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField label="Input 1" name="input1" value={form.input1} onChange={onChange} />
              <SelectField label="Input 2" name="input2" value={form.input2} onChange={onChange} />
              <SelectField label="Input 3" name="input3" value={form.input3} onChange={onChange} />
              <SelectField label="Input 4" name="input4" value={form.input4} onChange={onChange} />
              <SelectField label="Output 1" name="output1" value={form.output1} onChange={onChange} />
              <SelectField label="Output 2" name="output2" value={form.output2} onChange={onChange} />
              <SelectField label="Output 3" name="output3" value={form.output3} onChange={onChange} />
              <SelectField label="Output 4" name="output4" value={form.output4} onChange={onChange} />
              <SelectField label="RS232" name="rs232" value={form.rs232} onChange={onChange} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-start">
        <p className="mb-4 text-center text-base font-medium text-slate-600 md:text-lg">
          Agregar Fotografía
        </p>

        <div className="flex h-56 w-full max-w-[260px] items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300 md:h-72">
          Sin imagen
        </div>

        <button
          type="button"
          className="mt-6 text-slate-500 hover:text-slate-700"
        >
          Cambiar Imagen
        </button>
      </div>
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

const SelectField = ({
  label,
  name,
  value,
  onChange,
}: SelectFieldProps) => {
  return (
    <Field label={label}>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={inputClass}
      >
        <option value="sin uso">sin uso</option>
      </select>
    </Field>
  )
}