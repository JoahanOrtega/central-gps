import type { AvlModelOption, OperatorOption, ProtocolOption, UnitGroupOption } from "../services/catalogServices";
import { inputClass } from "./new-unit-form.constants";
import type { FieldProps, NewUnitStepProps, SelectFieldProps } from "./new-unit-form.types";

interface NewUnitGeneralStepProps extends NewUnitStepProps {
  operators: OperatorOption[];
  unitGroups: UnitGroupOption[];
  avlModels: AvlModelOption[];
  protocolsIn: ProtocolOption[];
  protocolsOut: ProtocolOption[];
  protocolsRs232: ProtocolOption[];
  loadingCatalogs?: boolean;
}

export const NewUnitGeneralStep = ({ form,
  onChange,
  onImageChange,
  operators,
  unitGroups,
  avlModels,
  protocolsIn,
  protocolsOut,
  protocolsRs232,
  loadingCatalogs,
}: NewUnitGeneralStepProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        onImageChange?.(base64);
      };
      reader.readAsDataURL(file);
    }
  };
  return (
    <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[minmax(0,1.3fr)_320px]">
      <div className="space-y-6">
        {/* Primera fila: Número, Marca, Modelo, Año */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Numero *">
            <input name="numero" value={form.numero} onChange={onChange} className={inputClass} />
          </Field>
          <Field label="Marca *">
            <input name="marca" value={form.marca} onChange={onChange} className={inputClass} />
          </Field>
          <Field label="Modelo *">
            <input name="modelo" value={form.modelo} onChange={onChange} className={inputClass} />
          </Field>
          <Field label="Año *">
            <input name="anio" value={form.anio} onChange={onChange} className={inputClass} />
          </Field>
        </div>

        {/* Segunda fila: No. Serie, Matrícula, Tipo, Odómetro */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="No. Serie">
            <input name="no_serie" value={form.no_serie} onChange={onChange} className={inputClass} />
          </Field>
          <Field label="Matrícula *">
            <input name="matricula" value={form.matricula} onChange={onChange} className={inputClass} />
          </Field>
          <Field label="Tipo *">
            <select name="tipo" value={form.tipo} onChange={onChange} className={inputClass}>
              <option value="">- - -</option>
              <option value="1">Camión</option>
              <option value="2">Camioneta / Van</option>
              <option value="3">Tracto Camión</option>
              <option value="4">Tractor</option>
              <option value="5">Camión de carga</option>
              <option value="6">Grúa</option>
              <option value="7">Automóvil</option>
              <option value="8">Motocicleta</option>
              <option value="10">Revolvedora</option>
              <option value="12">Auto de carga</option>
              <option value="14">Pick Up</option>
              <option value="15">Montacargas</option>
              <option value="16">Excavadora</option>
              <option value="17">Camión de Volteo</option>
            </select>
          </Field>
          <Field label="Odometro *">
            <div className="relative">
              <input
                name="odometro_inicial"
                value={form.odometro_inicial}
                onChange={onChange}
                className={`${inputClass} pr-12`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">km</span>
            </div>
          </Field>
        </div>

        {/* Operador y Fecha Asignación */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Operador">
            <select
              name="id_operador"
              value={form.id_operador ?? ""}
              onChange={onChange}
              className={inputClass}
              disabled={loadingCatalogs}
            >
              {/* TODO: cargar operadores desde API */}
              <option value="">-seleccione-</option>
              {operators.map(op => (
                <option key={op.id_operador} value={op.id_operador}>
                  {op.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha de Asignación de Operador">
            <input
              type="date"
              name="fecha_asignacion_operador"
              value={form.fecha_asignacion_operador || ""}
              onChange={onChange}
              className={inputClass}
            />
          </Field>
        </div>

        {/* Grupos de Unidades */}
        <Field label="Grupos de Unidades">
          <select
            name="id_grupo_unidades"
            value={form.id_grupo_unidades ?? ""}
            onChange={onChange}
            className={inputClass}
            disabled={loadingCatalogs}
          >
            {/* TODO: cargar grupos */}
            <option value="">-seleccione-</option>
            {unitGroups.map(g => (
              <option key={g.id_grupo_unidades} value={g.id_grupo_unidades}>
                {g.nombre}
              </option>
            ))}
          </select>
        </Field>

        {/* Equipo Instalado */}
        <div>
          <h3 className="mb-4 text-xl font-semibold text-slate-700 md:text-2xl">Equipo Instalado</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Modelo AVL Instalado">
              <select
                name="id_modelo_avl"
                value={form.id_modelo_avl ?? ""}
                onChange={onChange}
                className={inputClass}
                disabled={loadingCatalogs}
              >
                <option value="">-seleccione-</option>
                {/* TODO: cargar modelos */}
                {avlModels.map(m => (
                  <option key={m.id_modelo_avl} value={m.id_modelo_avl}>
                    {m.modelo}
                  </option>
                ))}
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
              <input name="imei" value={form.imei} onChange={onChange} className={inputClass} />
            </Field>
            <Field label="Numero de Chip *">
              <input name="chip" value={form.chip} onChange={onChange} className={inputClass} />
            </Field>
          </div>

          {/* Periféricos Instalados */}
          <p className="mb-3 mt-5 text-base text-slate-600 md:text-lg">Periféricos Instalados</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SelectField label="Input 1" name="input1" value={form.input1} onChange={onChange} options={protocolsIn} />
            <SelectField label="Input 2" name="input2" value={form.input2} onChange={onChange} options={protocolsIn} />
            <SelectField label="Input 3" name="input3" value={form.input3} onChange={onChange} options={protocolsIn} />
            <SelectField label="Input 4" name="input4" value={form.input4} onChange={onChange} options={protocolsIn} />
            <SelectField label="Output 1" name="output1" value={form.output1} onChange={onChange} options={protocolsOut} />
            <SelectField label="Output 2" name="output2" value={form.output2} onChange={onChange} options={protocolsOut} />
            <SelectField label="Output 3" name="output3" value={form.output3} onChange={onChange} options={protocolsOut} />
            <SelectField label="Output 4" name="output4" value={form.output4} onChange={onChange} options={protocolsOut} />
            <SelectField label="RS232" name="rs232" value={form.rs232} onChange={onChange} options={protocolsRs232} />
          </div>
        </div>
      </div>

      {/* Sección de imagen (placeholder mejorado) */}
      <div className="flex flex-col items-center justify-start">
        <p className="mb-4 text-center text-base font-medium text-slate-600 md:text-lg">
          Agregar Fotografía
        </p>
        <div className="flex h-56 w-full max-w-[260px] items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300 md:h-72">
          {form.imagen ? (
            <img src={form.imagen} alt="Preview" className="h-full w-full object-cover rounded-lg" />
          ) : (
            <span>Sin imagen</span>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="imagen-input"
        />
        <button
          type="button"
          onClick={() => document.getElementById('imagen-input')?.click()}
          className="mt-6 text-slate-500 hover:text-slate-700"
        >
          Cambiar Imagen
        </button>
      </div>
    </div>
  );
};

// Componentes Field y SelectField (pueden permanecer igual o mejorarlos)
const Field = ({ label, children }: FieldProps) => (
  <label className="block">
    <span className="mb-2 block text-sm text-slate-600">{label}</span>
    {children}
  </label>
);

const SelectField = ({ label, name, value, onChange, options }: SelectFieldProps & { options?: ProtocolOption[] }) => (
  <Field label={label}>
    <select name={name} value={value} onChange={onChange} className={inputClass}>
      <option value="sin uso">sin uso</option>
      {options?.map(opt => (
        <option key={opt.id_protocolo} value={opt.id_protocolo}>
          {opt.nombre}
        </option>
      ))}
    </select>
  </Field>
);