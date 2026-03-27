import { LayoutDashboard, MapPinned, BarChart3 } from "lucide-react";
import { NavLink } from "react-router-dom";
import logo from "@/assets/images/logo_full.png";

const sidebarItemClass =
  "flex h-16 w-16 items-center justify-center rounded-2xl border transition-colors";
const sidebarIconClass = "h-7 w-7";

export const HomeSidebar = () => {
  return (
    <aside className="flex h-full w-[88px] flex-col items-center border-r border-slate-200 bg-white py-4">
      <div className="mb-8">
        <img src={logo} alt="CentralGPS" className="h-16 w-16 object-contain" />
      </div>

      <nav className="flex flex-col gap-4">
        <NavLink
          to="/home/dashboard"
          className={({ isActive }) =>
            `${sidebarItemClass} ${
              isActive
                ? "border-sky-300 bg-sky-50 text-sky-600"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`
          }
        >
          <LayoutDashboard className={sidebarIconClass} />
        </NavLink>

        <NavLink
          to="/home/maps"
          className={({ isActive }) =>
            `${sidebarItemClass} ${
              isActive
                ? "border-sky-300 bg-sky-50 text-sky-600"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`
          }
        >
          <MapPinned className={sidebarIconClass} />
        </NavLink>

        <NavLink
          to="/home/reports"
          className={({ isActive }) =>
            `${sidebarItemClass} ${
              isActive
                ? "border-sky-300 bg-sky-50 text-sky-600"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`
          }
        >
          <BarChart3 className={sidebarIconClass} />
        </NavLink>
      </nav>
    </aside>
  );
};
