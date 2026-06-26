import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

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
  default: { text: "text-slate-700", hover: "hover:bg-slate-50", icon: "text-slate-500" },
  warning: { text: "text-amber-700", hover: "hover:bg-amber-50", icon: "text-amber-500" },
  destructive: { text: "text-red-600", hover: "hover:bg-red-50", icon: "text-red-500" },
};

const MENU_WIDTH = 176; // w-44 = 11rem = 176px

// Menú de tres puntos (kebab).
export const KebabMenu = ({ items, entityName }: KebabMenuProps) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEscapeKey(() => setOpen(false), open);

  // Calcula la posición del panel a partir del botón. Se hace en layout effect
  // para medir antes de pintar y evitar un parpadeo en la esquina.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    // Alineado a la derecha del botón (como antes con right-0), 4px abajo.
    setCoords({
      top: rect.bottom + 4,
      left: rect.right - MENU_WIDTH,
    });
  }, [open]);

  // Click fuera: como el panel está en un portal (fuera del botón en el DOM),
  // hay que excluir clicks tanto del botón como del propio panel. Reposiciona
  // también al hacer scroll/resize para que no quede "flotando" desfasado.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onReflow = () => setOpen(false);

    document.addEventListener("mousedown", onPointerDown);
    // El scroll dentro de la lista del drawer movería el botón; cerrar es lo
    // más simple y predecible (evita el panel pegado en el aire).
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open]);

  if (items.length === 0) return null;

  // Separador antes del primer item no-default (warning o destructive)
  const firstNonDefaultIndex = items.findIndex(
    (i) => i.variant === "warning" || i.variant === "destructive",
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Acciones de ${entityName}`}
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            // z-50 para quedar por encima de los drawers (z-20) y del mapa.
            style={{ position: "fixed", top: coords.top, left: coords.left, width: MENU_WIDTH }}
            className="z-50 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
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
          </div>,
          document.body,
        )}
    </>
  );
};