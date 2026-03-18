export type SidebarSection = "dashboard" | "maps" | "reports";

export type NavbarSection = "catalogs" | "operation" | "fuel";

export interface NavbarItem {
  id: string;
  label: string;
}

export interface NavbarGroup {
  id: NavbarSection;
  label: string;
  items: NavbarItem[];
}