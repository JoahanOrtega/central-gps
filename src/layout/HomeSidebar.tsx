import {
  BarChart3, LayoutDashboard, MapPinned,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { usePermiso } from "@/hooks/usePermiso";
import logo from "@/assets/images/logo_full.png";

interface SidebarNavLinkProps {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const SidebarNavLink = ({ to, label, icon }: SidebarNavLinkProps) => (
  <NavLink
    to={to}
    aria-label={label}
    title={label}  // Tooltip nativo — aparece en hover, útil en sidebar estrecho
    className={({ isActive }) =>
      [
        "flex w-16 flex-col items-center gap-1 rounded-2xl border py-3 transition-colors",
        isActive
          ? "border-sky-300 bg-sky-50 text-sky-600"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700",
      ].join(" ")
    }
  >
    <span className="h-6 w-6" aria-hidden="true">{icon}</span>
    <span className="text-[10px] font-medium leading-none">{label}</span>
  </NavLink>
);

export const HomeSidebar = () => {
  const puedeMapa = usePermiso("mapa.ver");
  const puedeReportes = usePermiso("reportes.ver");

  return (
    <aside className="flex h-full w-[88px] flex-col items-center border-r border-slate-200 bg-white py-4">
      {/* Logo */}
      <div className="mb-6">
        <img src={logo} alt="CentralGPS" className="h-16 w-16 object-contain" />
      </div>

      <nav className="flex flex-col gap-3" aria-label="Navegación principal">
        {/* Dashboard */}
        <SidebarNavLink
          to="/home/dashboard"
          label="Dashboard"
          icon={<LayoutDashboard className="h-6 w-6" />}
        />

        {/* Mapa */}
        {puedeMapa && (
          <SidebarNavLink
            to="/home/maps"
            label="Mapa"
            icon={<MapPinned className="h-6 w-6" />}
          />
        )}

        {/* Reportes */}
        {puedeReportes && (
          <SidebarNavLink
            to="/home/reports"
            label="Reportes"
            icon={<BarChart3 className="h-6 w-6" />}
          />
        )}
      </nav>
    </aside>
  );
};