import { LayoutDashboard, MapPinned, BarChart3 } from "lucide-react";
import { NavLink } from "react-router-dom";
import logo from "@/assets/images/logo_full.png";

// ── Estilos base del item de navegación ───────────────────────
const sidebarItemClass =
  "flex h-16 w-16 items-center justify-center rounded-2xl border transition-colors";
const sidebarIconClass = "h-7 w-7";

// ── Item de navegación reutilizable ───────────────────────────
// Centraliza el estilo activo/inactivo y los atributos de
// accesibilidad para todos los botones del sidebar.
interface SidebarNavLinkProps {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const SidebarNavLink = ({ to, label, icon }: SidebarNavLinkProps) => (
  <NavLink
    to={to}
    // title → tooltip nativo al hacer hover en desktop
    title={label}
    // aria-label → anuncia el destino a lectores de pantalla
    aria-label={label}
    className={({ isActive }) =>
      `${sidebarItemClass} ${isActive
        ? "border-sky-300 bg-sky-50 text-sky-600"
        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      }`
    }
  >
    <span className={sidebarIconClass}>{icon}</span>
  </NavLink>
);

// ── Sidebar de navegación principal ──────────────────────────
export const HomeSidebar = () => {
  return (
    <aside className="flex h-full w-[88px] flex-col items-center border-r border-slate-200 bg-white py-4">
      <div className="mb-8">
        <img src={logo} alt="CentralGPS" className="h-16 w-16 object-contain" />
      </div>

      <nav className="flex flex-col gap-4" aria-label="Navegación principal">
        <SidebarNavLink
          to="/home/dashboard"
          label="Dashboard"
          icon={<LayoutDashboard className={sidebarIconClass} />}
        />
        <SidebarNavLink
          to="/home/maps"
          label="Mapa"
          icon={<MapPinned className={sidebarIconClass} />}
        />
        <SidebarNavLink
          to="/home/reports"
          label="Reportes"
          icon={<BarChart3 className={sidebarIconClass} />}
        />
      </nav>
    </aside>
  );
};