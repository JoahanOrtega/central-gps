import { useHomeNavigation } from "../../hooks/use-home-navigation";
import { DashboardView } from "../dashboard/DashboardView";
import { MapsView } from "../maps/MapsView";
import { ReportsView } from "../reports/ReportsView";

export const HomeContent = () => {
  const { activeSection, activeNavbarItem } = useHomeNavigation();

  if (activeSection === "dashboard") {
    return <DashboardView />;
  }

  if (activeSection === "maps") {
    return <MapsView activeItem={activeNavbarItem} />;
  }

  if (activeSection === "reports") {
    return <ReportsView activeItem={activeNavbarItem} />;
  }

  return null;
};