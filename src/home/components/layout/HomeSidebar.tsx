import { LayoutDashboard, MapPinned, BarChart3 } from "lucide-react";
import { SidebarButton } from "../shared/SidebarButton";
import { useHomeNavigation } from "../../hooks/use-home-navigation";
import logo from "@/assets/images/logo_full.png";

export const HomeSidebar = () => {
  const { activeSidebarSection, setActiveSidebarSection } = useHomeNavigation();

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
          isActive={activeSidebarSection === "dashboard"}
          onClick={() => setActiveSidebarSection("dashboard")}
        >
          <LayoutDashboard className="h-7 w-7" />
        </SidebarButton>

        <SidebarButton
          title="Mapa"
          isActive={activeSidebarSection === "maps"}
          onClick={() => setActiveSidebarSection("maps")}
        >
          <MapPinned className="h-7 w-7" />
        </SidebarButton>

        <SidebarButton
          title="Reportes"
          isActive={activeSidebarSection === "reports"}
          onClick={() => setActiveSidebarSection("reports")}
        >
          <BarChart3 className="h-7 w-7" />
        </SidebarButton>
      </div>
    </aside>
  );
};