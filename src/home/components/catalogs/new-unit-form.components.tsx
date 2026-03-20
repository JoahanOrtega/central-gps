import type { ReactNode } from "react"
import { inputClass } from "./new-unit-form.constants"

export const Field = ({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) => {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-600">{label}</span>
      {children}
    </label>
  )
}

export const SelectField = ({
  label,
  name,
  value,
  onChange,
}: {
  label: string
  name: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void
}) => {
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