import { apiFetch } from "@/lib/api";
import type {
    DashboardPeriodo,
    DashboardSummary,
} from "../types/dashboard.types";

// Mismo patrón de idEmpresa que unitService: sudo_erp lo pasa explícito
// por query param, los demás roles lo heredan del JWT en el backend.
export const dashboardService = {
    getSummary(
        periodo: DashboardPeriodo,
        idEmpresa?: number | null,
    ): Promise<DashboardSummary> {
        const params = new URLSearchParams({ periodo });
        if (idEmpresa) params.set("id_empresa", String(idEmpresa));
        return apiFetch<DashboardSummary>(
            `/dashboard/summary?${params.toString()}`,
            { method: "GET" },
        );
    },
};