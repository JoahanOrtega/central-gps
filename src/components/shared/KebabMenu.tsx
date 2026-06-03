import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface KebabMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  // "default"     = texto slate normal (editar, ver, etc.)
  // "warning"     = texto ámbar (inhabilitar, suspender — reversible)
  // "destructive" = texto rojo (eliminar — irreversible)
  variant?: "default" | "warning" | "destructive";
  onClick: () => void;
}

interface KebabMenuProps {
  items: KebabMenuItem[];
  entityName: string;
}

// Estilos por variante — separados para claridad y fácil extensión
const VARIANT_STYLES: Record<string, { text: string; hover: string; icon: string }> = {
  default:     { text: "text-slate-700", hover: "hover:bg-slate-50",  icon: "text-slate-500" },
  warning:     { text: "text-amber-700", hover: "hover:bg-amber-50",  icon: "text-amber-500" },
  destructive: { text: "text-red-600",   hover: "hover:bg-red-50",    icon: "text-red-500" },
};

// Menú de tres puntos (kebab) con cierre al hacer click fuera y con Escape.
export const KebabMenu = ({ items, entityName }: KebabMenuProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  if (items.length === 0) return null;

  // Separador antes del primer item no-default (warning o destructive)
  const firstNonDefaultIndex = items.findIndex(
    (i) => i.variant === "warning" || i.variant === "destructive",
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Acciones de ${entityName}`}
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            const variant = item.variant ?? "default";
            const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.default;
            const showSeparator = index === firstNonDefaultIndex && index > 0;

            return (
              <div key={item.id}>
                {showSeparator && (
                  <div className="border-t border-slate-100" aria-hidden="true" />
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm ${styles.text} ${styles.hover}`}
                >
                  <Icon className={`h-4 w-4 ${styles.icon}`} />
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};