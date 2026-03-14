import { createContext, useMemo, useState, type PropsWithChildren } from "react";
import type { HomeSection, NavbarItem } from "../types/home.types";

interface HomeNavigationContextValue {
  activeSection: HomeSection;
  setActiveSection: (section: HomeSection) => void;
  navbarItems: NavbarItem[];
  activeNavbarItem: string;
  setActiveNavbarItem: (itemId: string) => void;
}

export const HomeNavigationContext =
  createContext<HomeNavigationContextValue | undefined>(undefined);

const navbarConfig: Record<HomeSection, NavbarItem[]> = {
  dashboard: [{ id: "resumen", label: "Dashboard" }],
  maps: [{ id: "monitor", label: "Maps" }],
  reports: [{ id: "general", label: "Reports" }],
};

export const HomeNavigationProvider = ({ children }: PropsWithChildren) => {
  const [activeSection, setActiveSectionState] =
    useState<HomeSection>("dashboard");
  const [activeNavbarItem, setActiveNavbarItem] = useState<string>("resumen");

  const setActiveSection = (section: HomeSection) => {
    setActiveSectionState(section);
    setActiveNavbarItem(navbarConfig[section][0].id);
  };

  const value = useMemo(
    () => ({
      activeSection,
      setActiveSection,
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