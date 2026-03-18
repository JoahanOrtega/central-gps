import { useHomeNavigation } from "../../hooks/use-home-navigation";
import { DashboardView } from "../dashboard/DashboardView";
import { CatalogsView } from "../catalogs/CatalogsView";

const PlaceholderView = ({ title }: { title: string }) => {
  return (
    <main className="h-full overflow-y-auto bg-[#f5f6f8] p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
        <p className="mt-2 text-slate-500">Esta vista se implementará después.</p>
      </section>
    </main>
  );
};

export const HomeContent = () => {
  const {
    activeSidebarSection,
    activeNavbarSection,
    activeNavbarItem,
  } = useHomeNavigation();

  if (activeNavbarSection === "catalogs" && activeNavbarItem === "units") {
    return <CatalogsView activeItem="units" />;
  }

  if (activeSidebarSection === "dashboard") {
    return <DashboardView />;
  }

  if (activeSidebarSection === "maps") {
    return <PlaceholderView title="Mapa" />;
  }

  if (activeSidebarSection === "reports") {
    return <PlaceholderView title="Reportes" />;
  }

  if (activeNavbarSection === "operation") {
    return <PlaceholderView title="Operación" />;
  }

  if (activeNavbarSection === "fuel") {
    return <PlaceholderView title="Combustible" />;
  }

  return <DashboardView />;
};