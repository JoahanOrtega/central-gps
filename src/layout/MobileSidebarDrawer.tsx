import React, { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3, Building2, FolderOpen,
  LayoutDashboard, Map, MapPinned, Menu,
  Truck, Users, X,
} from "lucide-react";
import { usePermiso } from "@/hooks/usePermiso";
import logo from "@/assets/images/logo_full.png";
import { cn } from "@/lib/utils";

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DrawerLinkProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  onClose: () => void;
}

const DrawerLink = ({ to, label, icon, onClose }: DrawerLinkProps) => (
  <NavLink
    to={to}
    onClick={onClose}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-sky-50 text-sky-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-800",
      )
    }
  >
    <span className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true">
      {icon}
    </span>
    {label}
  </NavLink>
);

export const MobileSidebarDrawer = ({
  isOpen,
  onClose,
}: MobileSidebarDrawerProps) => {
  const location = useLocation();
  const prevPathRef = React.useRef(location.pathname);

  // Cerrar al cambiar de ruta — pero NO al montar (compara con el valor anterior)
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      onClose();
    }
  }, [location.pathname, onClose]);

  // Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const puedeMapa = usePermiso("mapa.ver");
  const puedeReportes = usePermiso("reportes.ver");
  const puedeUnidades = usePermiso("unidades.ver");
  const puedeClientes = usePermiso("clientes.ver");
  const puedePois = usePermiso("pois.ver");
  const puedeUsuarios = usePermiso("usuarios.ver");
  const puedeOperadores = usePermiso("operadores.ver");

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-white shadow-xl transition-transform duration-300 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        {/* Encabezado del drawer */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <img src={logo} alt="CentralGPS" className="h-10 w-10 object-contain" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <nav className="px-3 py-4 space-y-6">

          {/* Principal */}
          <div>
            {puedeMapa && (
              <DrawerLink
                to="/home/maps" label="Mapa"
                icon={<MapPinned className="h-4 w-4" />}
                onClose={onClose}
              />
            )}
            <DrawerLink
              to="/home/dashboard" label="Dashboard"
              icon={<LayoutDashboard className="h-4 w-4" />}
              onClose={onClose}
            />
            {puedeReportes && (
              <DrawerLink
                to="/home/reports" label="Reportes"
                icon={<BarChart3 className="h-4 w-4" />}
                onClose={onClose}
              />
            )}
          </div>

          {/* Catálogos */}
          {(puedeUnidades || puedeClientes || puedePois || puedeUsuarios || puedeOperadores) && (
            <div>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Catálogos
              </p>
              {puedeUnidades && (
                <DrawerLink to="/home/catalogs/units" label="Unidades"
                  icon={<Truck className="h-4 w-4" />} onClose={onClose} />
              )}
              {puedeClientes && (
                <DrawerLink to="/home/catalogs/clients" label="Clientes"
                  icon={<Building2 className="h-4 w-4" />} onClose={onClose} />
              )}
              {puedePois && (
                <DrawerLink to="/home/catalogs/points-of-interest" label="Puntos de Interés"
                  icon={<MapPinned className="h-4 w-4" />} onClose={onClose} />
              )}
              {puedeOperadores && (
                <DrawerLink to="/home/catalogs/operators" label="Operadores"
                  icon={<Users className="h-4 w-4" />} onClose={onClose} />
              )}
              {puedePois && (
                <DrawerLink to="/home/catalogs/poi-groups" label="Grupos de POI"
                  icon={<FolderOpen className="h-4 w-4" />} onClose={onClose} />
              )}
              {puedeUsuarios && (
                <DrawerLink to="/home/catalogs/users" label="Usuarios"
                  icon={<Users className="h-4 w-4" />} onClose={onClose} />
              )}
            </div>
          )}

          {/* Operación */}
          {puedeMapa && (
            <div>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Operación
              </p>
              <DrawerLink to="/home/operation/monitor" label="Monitor de Flota"
                icon={<Map className="h-4 w-4" />} onClose={onClose} />
            </div>
          )}
        </nav>
      </div>
    </>
  );
};