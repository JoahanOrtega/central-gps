import { createContext, useMemo, useState, type PropsWithChildren } from "react";
import type {
  SidebarSection,
  NavbarGroup,
  NavbarSection,
} from "../types/home.types";

interface HomeNavigationContextValue {
  activeSidebarSection: SidebarSection;
  setActiveSidebarSection: (section: SidebarSection) => void;
  activeNavbarSection: NavbarSection | null;
  activeNavbarItem: string | null;
  navbarGroups: NavbarGroup[];
  setActiveNavbarItem: (section: NavbarSection, itemId: string) => void;
}

export const HomeNavigationContext =
  createContext<HomeNavigationContextValue | undefined>(undefined);

const navbarGroups: NavbarGroup[] = [
  {
    id: "catalogs",
    label: "Catálogos",
    items: [
      { id: "units", label: "Unidades" },
      { id: "clients", label: "Clientes" },
      { id: "terminals", label: "Terminales" },
      { id: "operators", label: "Operadores" },
      { id: "interest-points", label: "Puntos de Interés" },
      { id: "gas-stations", label: "Gasolineras" },
      { id: "users", label: "Usuarios" },
    ],
  },
  {
    id: "operation",
    label: "Operación",
    items: [{ id: "monitor", label: "Monitor de flota" }],
  },
  {
    id: "fuel",
    label: "Combustible",
    items: [{ id: "general", label: "General" }],
  },
];

export const HomeNavigationProvider = ({ children }: PropsWithChildren) => {
  const [activeSidebarSection, setActiveSidebarSection] =
    useState<SidebarSection>("dashboard");

  const [activeNavbarSection, setActiveNavbarSection] =
    useState<NavbarSection | null>("catalogs");

  const [activeNavbarItem, setActiveNavbarItemState] =
    useState<string | null>("units");

  const setActiveNavbarItem = (section: NavbarSection, itemId: string) => {
    setActiveNavbarSection(section);
    setActiveNavbarItemState(itemId);
  };

  const value = useMemo(
    () => ({
      activeSidebarSection,
      setActiveSidebarSection,
      activeNavbarSection,
      activeNavbarItem,
      navbarGroups,
      setActiveNavbarItem,
    }),
    [activeSidebarSection, activeNavbarSection, activeNavbarItem],
  );

  return (
    <HomeNavigationContext.Provider value={value}>
      {children}
    </HomeNavigationContext.Provider>
  );
};