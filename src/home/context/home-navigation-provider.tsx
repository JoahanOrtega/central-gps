import {
  createContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { HomeSection, NavbarItem } from "../types/home.types";

interface HomeNavigationContextValue {
  activeSection: HomeSection;
  setActiveSection: (section: HomeSection) => void;
  navbarItems: NavbarItem[];
  activeNavbarItem: string;
  setActiveNavbarItem: (itemId: string) => void;
}

export const HomeNavigationContext = createContext<
  HomeNavigationContextValue | undefined
>(undefined);

const navbarConfig: Record<HomeSection, NavbarItem[]> = {
  dashboard: [{ id: "resumen", label: "Dashboard" }],
  catalogos: [
    { id: "clientes", label: "Clientes" },
    { id: "vehiculos", label: "Vehículos" },
    { id: "conductores", label: "Conductores" },
  ],
  operacion: [
    { id: "monitor", label: "Monitor de flota" },
    { id: "rutas", label: "Rutas" },
    { id: "eventos", label: "Eventos" },
  ],
  combustible: [
    { id: "cargas", label: "Cargas" },
    { id: "consumo", label: "Consumo" },
    { id: "rendimiento", label: "Rendimiento" },
  ],
};

export const HomeNavigationProvider = ({ children }: PropsWithChildren) => {
  const [activeSection, setActiveSection] = useState<HomeSection>("dashboard");
  const [activeNavbarItem, setActiveNavbarItem] = useState<string>("resumen");

  const handleSetActiveSection = (section: HomeSection) => {
    setActiveSection(section);
    const firstItem = navbarConfig[section][0];
    setActiveNavbarItem(firstItem.id);
  };

  const value = useMemo(
    () => ({
      activeSection,
      setActiveSection: handleSetActiveSection,
      navbarItems: navbarConfig[activeSection],
      activeNavbarItem,
      setActiveNavbarItem,
    }),
    [activeSection, activeNavbarItem],
  );

  return (
    <HomeNavigationContext.Provider value={value}>
      {children}
    </HomeNavigationContext.Provider>
  );
};
