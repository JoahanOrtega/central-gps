// Definiciones de tipos para la sección de Home
export type HomeSection =
  | "dashboard"
  | "maps"
  | "reports";

// Definición de la interfaz para los elementos de navegación en el Home
export interface NavbarItem {
  id: string;
  label: string;
}
