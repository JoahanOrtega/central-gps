import { useHomeNavigation } from "../../hooks/use-home-navigation";
import { DashboardView } from "../dashboard/DashboardView";
import { CatalogsView } from "../catalogs/CatalogsView";
import { OperationView } from "../operation/OperationView";
import { FuelView } from "../fuel/FuelView";

export const HomeContent = () => {
  const { activeSection, activeNavbarItem } = useHomeNavigation();

  if (activeSection === "dashboard") {
    return <DashboardView />;
  }

  if (activeSection === "catalogos") {
    return <CatalogsView activeItem={activeNavbarItem} />;
  }

  if (activeSection === "operacion") {
    return <OperationView activeItem={activeNavbarItem} />;
  }

  if (activeSection === "combustible") {
    return <FuelView activeItem={activeNavbarItem} />;
  }

  return null;
};
