import type { AvlModelOption, OperatorOption, UnitGroupOption } from "../services/catalogServices";
import { inputClass } from "./new-unit-form.constants";
import type { FieldProps, NewUnitStepProps } from "./new-unit-form.types";

interface NewUnitGeneralStepProps extends NewUnitStepProps {
  operators: OperatorOption[];
  unitGroups: UnitGroupOption[];
  avlModels: AvlModelOption[];
  loadingCatalogs?: boolean;
  onBlur?: (event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export const NewUnitGeneralStep = ({
  form,
  onChange,
  onBlur,
  onImageChange,
  onGroupSelectionChange,
  operators,
  unitGroups,
  avlModels,
  loadingCatalogs,
  errors = {},
  touched = {},
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

  const handleSelectAllGroups = () => {
    const allIds = unitGroups.map(g => g.id_grupo_unidades);
    onGroupSelectionChange?.(allIds);
  };

  const handleDeselectAllGroups = () => {
    onGroupSelectionChange?.([]);
  };

  const handleToggleGroup = (groupId: number, checked: boolean) => {
    const currentGroups = form.id_grupo_unidades ?? [];
    const newSelection = checked
      ? [...currentGroups, groupId]
      : currentGroups.filter(id => id !== groupId);
    onGroupSelectionChange?.(newSelection);
  };

  return (
    <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[minmax(0,1.3fr)_320px]">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Número *" error={errors.numero} touched={touched.numero}>
            <input name="numero" value={form.numero} onChange={onChange} onBlur={onBlur} className={inputClass} />
          </Field>
          <Field label="Marca *" error={errors.marca} touched={touched.marca}>
            <input name="marca" value={form.marca} onChange={onChange} onBlur={onBlur} className={inputClass} />
          </Field>
          <Field label="Modelo">
            <input name="modelo" value={form.modelo ?? ""} onChange={onChange} className={inputClass} />
          </Field>
          <Field label="Año">
            <input name="anio" value={form.anio ?? ""} onChange={onChange} className={inputClass} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="No. Serie">
            <input name="no_serie" value={form.no_serie ?? ""} onChange={onChange} className={inputClass} />
          </Field>
          <Field label="Matrícula">
            <input name="matricula" value={form.matricula ?? ""} onChange={onChange} className={inputClass} />
          </Field>
          <Field label="Tipo *" error={errors.tipo} touched={touched.tipo}>
            <select name="tipo" value={form.tipo} onChange={onChange} onBlur={onBlur} className={inputClass}>
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
          <Field label="Odómetro *" error={errors.odometro_inicial} touched={touched.odometro_inicial}>
            <div className="relative">
              <input name="odometro_inicial" value={form.odometro_inicial} onChange={onChange} onBlur={onBlur} className={`${inputClass} pr-12`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">km</span>
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Operador">
            <select name="id_operador" value={form.id_operador ?? ""} onChange={onChange} className={inputClass} disabled={loadingCatalogs}>
              <option value="">-seleccione-</option>
              {operators.map(op => (
                <option key={op.id_operador} value={op.id_operador}>{op.nombre}</option>
              ))}
            </select>
          </Field>
          <Field label="Fecha de Asignación de Operador">
            <input type="date" name="fecha_asignacion_operador" value={form.fecha_asignacion_operador ?? ""} onChange={onChange} className={inputClass} />
          </Field>
        </div>

        <Field label="Grupos de Unidades">
          <div className="rounded-md border border-slate-300 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-600">
                Seleccionados {form.id_grupo_unidades?.length ?? 0} de {unitGroups.length}
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={handleSelectAllGroups} className="text-xs text-blue-600 hover:underline" disabled={loadingCatalogs}>
                  Seleccionar Todos
                </button>
                <button type="button" onClick={handleDeselectAllGroups} className="text-xs text-blue-600 hover:underline" disabled={loadingCatalogs}>
                  Desmarcar Todos
                </button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto p-2">
              {loadingCatalogs ? (
                <p className="p-2 text-sm text-slate-500">Cargando grupos...</p>
              ) : unitGroups.length === 0 ? (
                <p className="p-2 text-sm text-slate-500">No hay grupos disponibles</p>
              ) : (
                unitGroups.map(group => {
                  const checked = (form.id_grupo_unidades ?? []).includes(group.id_grupo_unidades);
                  return (
                    <label key={group.id_grupo_unidades} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50">
                      <input type="checkbox" checked={checked} onChange={(e) => handleToggleGroup(group.id_grupo_unidades, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
                      <span className="text-sm text-slate-700">{group.nombre}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </Field>

        <div>
          <h3 className="mb-4 text-xl font-semibold text-slate-700 md:text-2xl">Equipo Instalado</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Modelo AVL Instalado">
              <select name="id_modelo_avl" value={form.id_modelo_avl ?? ""} onChange={onChange} className={inputClass} disabled={loadingCatalogs}>
                <option value="">-seleccione-</option>
                {avlModels.map(m => (
                  <option key={m.id_modelo_avl} value={m.id_modelo_avl}>{m.modelo}</option>
                ))}
              </select>
            </Field>
            <Field label="Fecha Instalación *" error={errors.fecha_instalacion} touched={touched.fecha_instalacion}>
              <input type="date" name="fecha_instalacion" value={form.fecha_instalacion} onChange={onChange} onBlur={onBlur} className={inputClass} />
            </Field>
            <Field label="Número IMEI del AVL *" error={errors.imei} touched={touched.imei}>
              <input name="imei" value={form.imei} onChange={onChange} onBlur={onBlur} className={inputClass} />
            </Field>
            <Field label="Número de Chip *" error={errors.chip} touched={touched.chip}>
              <input name="chip" value={form.chip} onChange={onChange} onBlur={onBlur} className={inputClass} />
            </Field>
          </div>

          <p className="mb-3 mt-5 text-base text-slate-600 md:text-lg">Periféricos Instalados</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Input 1">
              <select name="input1" value={form.input1} onChange={onChange} className={inputClass}>
                <option value="0">sin uso</option>
                <option value="1">Encendido/Apagado</option>
                <option value="2">Sensor de puerta</option>
                <option value="3">Botón de pánico</option>
              </select>
            </Field>
            <Field label="Input 2">
              <select name="input2" value={form.input2} onChange={onChange} className={inputClass}>
                <option value="0">sin uso</option>
                <option value="1">Encendido/Apagado</option>
                <option value="2">Sensor de puerta</option>
                <option value="3">Botón de pánico</option>
              </select>
            </Field>
            <Field label="Output 1">
              <select name="output1" value={form.output1} onChange={onChange} className={inputClass}>
                <option value="0">sin uso</option>
                <option value="1">Bloqueo de motor</option>
                <option value="2">Bocina</option>
              </select>
            </Field>
            <Field label="Output 2">
              <select name="output2" value={form.output2} onChange={onChange} className={inputClass}>
                <option value="0">sin uso</option>
                <option value="1">Bloqueo de motor</option>
                <option value="2">Bocina</option>
              </select>
            </Field>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-start">
        <p className="mb-4 text-center text-base font-medium text-slate-600 md:text-lg">Agregar Fotografía</p>
        <div className="flex h-56 w-full max-w-[260px] items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300 md:h-72">
          {form.imagen ? (
            <img src={form.imagen} alt="Preview" className="h-full w-full object-cover rounded-lg" />
          ) : (
            <span>Sin imagen</span>
          )}
        </div>
        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="imagen-input" />
        <button type="button" onClick={() => document.getElementById('imagen-input')?.click()} className="mt-6 text-slate-500 hover:text-slate-700">
          Cambiar Imagen
        </button>
      </div>
    </div>
  );
};

const Field = ({ label, children, error, touched }: FieldProps & { error?: string; touched?: boolean }) => (
  <label className="block">
    <span className="mb-2 block text-sm text-slate-600">{label}</span>
    {children}
    {touched && error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
  </label>
);