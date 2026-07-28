// Contrato de GET /dashboard/summary — espejo exacto de dashboard_routes.py.

export type DashboardPeriodo = "hoy" | "7d" | "30d";

export interface DashboardKilometros {
    total: number;
    unidades_con_km: number;
}

export interface DashboardUso {
    minutos_movimiento: number;
    minutos_ralenti: number;
}

export interface DashboardExcesos {
    eventos: number;
    minutos: number;
    unidades: number;
}

// Punto de la serie temporal: bucket horario (hoy) o diario (7d/30d).
export interface DashboardSeriePunto {
    bucket: string; // ISO con offset -06:00
    km: number;
}

export interface DashboardTopUnidad {
    id: number;
    numero: string;
    marca: string | null;
    modelo: string | null;
    km: number;
    minutos_uso: number;
    excesos: number;
}

export interface DashboardSummary {
    periodo: DashboardPeriodo;
    rango: { inicio: string; fin: string };
    kilometros: DashboardKilometros;
    uso: DashboardUso;
    excesos: DashboardExcesos;
    serie: DashboardSeriePunto[];
    top_unidades: DashboardTopUnidad[];
}