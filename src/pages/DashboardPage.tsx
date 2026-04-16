import { DashboardView } from "@/features/dashboard/components/DashboardView";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export const DashboardPage = () => {
  useDocumentTitle("Dashboard");
  return <DashboardView />;
};