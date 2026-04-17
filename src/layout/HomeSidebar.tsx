import { LayoutDashboard, MapPinned, BarChart3 } from "lucide-react";
import { NavLink } from "react-router-dom";
import logo from "@/assets/images/logo_full.png";

// ── Item de navegación reutilizable ───────────────────────────────────────────
// Muestra un ícono + label visible siempre debajo — cumple el principio de
// "reconocimiento sobre recuerdo" (Nielsen #6): el usuario no necesita
// memorizar qué hace cada ícono porque la etiqueta está siempre visible.
//
// El sidebar tiene ancho fijo de 88px — las labels usan text-[10px] para
// caber sin truncar en nombres cortos como "Dashboard", "Mapa", "Reportes".
interface SidebarNavLinkProps {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const SidebarNavLink = ({ to, label, icon }: SidebarNavLinkProps) => (
  <NavLink
    to={to}
    aria-label={label}
    className={({ isActive }) =>
      [
        // Contenedor vertical: ícono arriba, label abajo
        "flex w-16 flex-col items-center gap-1 rounded-2xl border py-3 transition-colors",
        isActive
          ? "border-sky-300 bg-sky-50 text-sky-600"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700",
      ].join(" ")
    }
  >
    {/* Ícono — aria-hidden porque el aria-label del NavLink ya describe el destino */}
    <span className="h-6 w-6" aria-hidden="true">{icon}</span>

    {/* Label siempre visible — tamaño mínimo para caber en 64px de ancho */}
    <span className="text-[10px] font-medium leading-none">{label}</span>
  </NavLink>
);

// ── Sidebar de navegación principal ──────────────────────────────────────────
export const HomeSidebar = () => {
  return (
    <aside className="flex h-full w-[88px] flex-col items-center border-r border-slate-200 bg-white py-4">
      {/* Logo */}
      <div className="mb-8">
        <img src={logo} alt="CentralGPS" className="h-16 w-16 object-contain" />
      </div>

      <nav className="flex flex-col gap-3" aria-label="Navegación principal">
        <SidebarNavLink
          to="/home/dashboard"
          label="Dashboard"
          icon={<LayoutDashboard className="h-6 w-6" />}
        />
        <SidebarNavLink
          to="/home/maps"
          label="Mapa"
          icon={<MapPinned className="h-6 w-6" />}
        />
        <SidebarNavLink
          to="/home/reports"
          label="Reportes"
          icon={<BarChart3 className="h-6 w-6" />}
        />
      </nav>
    </aside>
  );
};