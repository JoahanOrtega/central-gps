import { LayoutDashboard, MapPinned, BarChart3 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarButton } from "../shared/SidebarButton";
import logo from "@/assets/images/logo_full.png";

export const HomeSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === "/home/dashboard";
  const isMaps = location.pathname === "/home/maps";
  const isReports = location.pathname === "/home/reports";

  return (
    <aside className="flex h-full w-[88px] flex-col items-center border-r border-slate-200 bg-white py-4">
      <div className="mb-8">
        <img
          src={logo}
          alt="CentralGPS"
          className="h-16 w-16 object-contain"
        />
      </div>

      <div className="flex flex-col gap-4">
        <SidebarButton
          title="Dashboard"
          isActive={isDashboard}
          onClick={() => navigate("/home/dashboard")}
        >
          <LayoutDashboard className="h-7 w-7" />
        </SidebarButton>

        <SidebarButton
          title="Mapa"
          isActive={isMaps}
          onClick={() => navigate("/home/maps")}
        >
          <MapPinned className="h-7 w-7" />
        </SidebarButton>

        <SidebarButton
          title="Reportes"
          isActive={isReports}
          onClick={() => navigate("/home/reports")}
        >
          <BarChart3 className="h-7 w-7" />
        </SidebarButton>
      </div>
    </aside>
  );
};