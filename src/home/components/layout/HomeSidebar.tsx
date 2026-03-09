import { LayoutDashboard, BookCopy, MapPinned, Fuel } from "lucide-react";
import { SidebarButton } from "../shared/SidebarButton";
import { useHomeNavigation } from "../../hooks/use-home-navigation";
import logo from "@/assets/images/logo_full.png";

export const HomeSidebar = () => {
  const { activeSection, setActiveSection } = useHomeNavigation();

  return (
    <aside className="h-full w-[88px] border-r border-slate-200 bg-white flex flex-col items-center py-4">
      <div className="mb-8">
        <img src={logo} alt="CentralGPS" className="h-16 w-16 object-contain" />
      </div>

      <div className="flex flex-col gap-4">
        <SidebarButton
          title="Dashboard"
          isActive={activeSection === "dashboard"}
          onClick={() => setActiveSection("dashboard")}
        >
          <LayoutDashboard className="h-7 w-7" />
        </SidebarButton>

        <SidebarButton
          title="Catálogos"
          isActive={activeSection === "catalogos"}
          onClick={() => setActiveSection("catalogos")}
        >
          <BookCopy className="h-7 w-7" />
        </SidebarButton>

        <SidebarButton
          title="Operación"
          isActive={activeSection === "operacion"}
          onClick={() => setActiveSection("operacion")}
        >
          <MapPinned className="h-7 w-7" />
        </SidebarButton>

        <SidebarButton
          title="Combustible"
          isActive={activeSection === "combustible"}
          onClick={() => setActiveSection("combustible")}
        >
          <Fuel className="h-7 w-7" />
        </SidebarButton>
      </div>
    </aside>
  );
};
