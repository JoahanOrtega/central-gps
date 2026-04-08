import { X, LayoutDashboard, MapPinned, BarChart3 } from "lucide-react";
import { NavLink } from "react-router-dom";
import logo from "@/assets/images/logo_full.png";

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSidebarDrawer = ({
  isOpen,
  onClose,
}: MobileSidebarDrawerProps) => {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-0 z-50 h-full w-[260px] bg-white shadow-xl transition-transform md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <img
            src={logo}
            alt="CentralGPS"
            className="h-12 w-12 object-contain"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 p-2 text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-2 p-4">
          <NavItem
            to="/home/dashboard"
            label="Dashboard"
            icon={<LayoutDashboard className="h-5 w-5" />}
            onClose={onClose}
          />
          <NavItem
            to="/home/maps"
            label="Mapa"
            icon={<MapPinned className="h-5 w-5" />}
            onClose={onClose}
          />
          <NavItem
            to="/home/reports"
            label="Reportes"
            icon={<BarChart3 className="h-5 w-5" />}
            onClose={onClose}
          />
        </nav>
      </aside>
    </>
  );
};

const NavItem = ({
  to,
  label,
  icon,
  onClose,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  onClose: () => void;
}) => {
  return (
    <NavLink
      to={to}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
          isActive
            ? "bg-sky-50 text-sky-600"
            : "text-slate-600 hover:bg-slate-50"
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
};
