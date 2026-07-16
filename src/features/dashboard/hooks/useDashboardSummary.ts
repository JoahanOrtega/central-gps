import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboardService";
import type { DashboardPeriodo } from "../types/dashboard.types";

// Refrescar cada minuto (60_000 ms) es suficiente para el dashboard, y evita
// que el usuario vea datos "congelados" si deja la pestaña abierta un buen rato.
const REFRESH_MS = 60_000;

// Hook que devuelve el resumen del dashboard para la empresa y periodo dados.
export const useDashboardSummary = (
    idEmpresa: number | null,
    periodo: DashboardPeriodo,
) => {
    return useQuery({
        queryKey: ["dashboard-summary", idEmpresa, periodo],
        queryFn: () => dashboardService.getSummary(periodo, idEmpresa),
        enabled: idEmpresa !== null,
        refetchInterval: REFRESH_MS,
        // Mantener los datos del periodo anterior visibles mientras carga el
        // nuevo evita el "flash" de skeletons al cambiar Hoy → 7 días.
        placeholderData: (prev) => prev,
    });
};