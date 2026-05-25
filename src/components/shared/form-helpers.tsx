// Helpers de formulario compartidos.

export const inputClass =
  "h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400";

export const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="mb-2 block text-sm text-slate-600">{label}</span>
    {children}
  </label>
);

/**
 * Boton de opción tipo radio con esfera visual personalizada.
 */
export const RadioOption = ({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-2 text-sm text-slate-700"
  >
    <span
      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
        checked ? "border-slate-500" : "border-slate-300"
      }`}
    >
      {checked && <span className="h-2 w-2 rounded-full bg-slate-500" />}
    </span>
    {label}
  </button>
);