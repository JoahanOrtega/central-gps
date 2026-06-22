import { MapsView } from "@/features/maps/components/MapsView";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export const MapsPage = () => {
  useDocumentTitle("Mapa");
  return <MapsView />;
};