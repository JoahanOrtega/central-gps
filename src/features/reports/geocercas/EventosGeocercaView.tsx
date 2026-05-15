// Estructura final:
//   - useEventosFilters → estado de filtros + validación local
//   - useEventosQueries → queries de TanStack (unidades, POIs, eventos)
//   - FiltersPanel      → sidebar de filtros completo
//   - EventsTable       → tabla desktop + cards mobile
//   - EventsPagination  → controles de paginación
//   - ErrorBanner       → errores tipificados
//   - TableSkeleton     → loading state
//   - EmptyState        → estado vacío

import { useState } from "react";
import { Bell, Download, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorBanner, clasificarError } from "@/components/shared/ErrorBanner";
import { TableSkeleton } from "@/components/shared/SkeletonCard";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";

import { eventosService } from "./eventosService";
import { useEventosFilters } from "./useEventosFilters";
import {
    useEventosQuery,
    usePoisQuery,
    useUnidadesQuery,
} from "./useEventosQueries";
import { FiltersPanel } from "./components/FiltersPanel";
import { EventsTable } from "./components/EventsTable";
import { EventsPagination } from "./components/EventsPagination";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export const EventosGeocercaView = () => {
    const { idEmpresa } = useEmpresaActiva();

    // ── Estado de filtros (Fase 2) y paginación ──────────────────────────────
    const filters = useEventosFilters();
    const [paginaActual, setPaginaActual] = useState(1);

    // Cuando se aplica un nuevo filtro, volver a página 1.
    // Aprovecho que `aplicar` ya valida — si falla, no resetea la página.
    const handleAplicar = (): boolean => {
        const ok = filters.aplicar();
        if (ok) setPaginaActual(1);
        return ok;
    };

    const handleLimpiar = () => {
        filters.limpiarTodo();
        setPaginaActual(1);
    };

    // ── Queries (Fase 3) ─────────────────────────────────────────────────────
    const { data: unidades = [] } = useUnidadesQuery(idEmpresa);
    const { data: pois = [] } = usePoisQuery(idEmpresa);
    const {
        data,
        isLoading,
        error,
        refetch,
    } = useEventosQuery(idEmpresa, filters.filtrosAplicados, paginaActual);

    // ── Datos derivados ──────────────────────────────────────────────────────
    const eventos = data?.eventos ?? [];
    const totalPaginas = data?.total_paginas ?? 1;
    const total = data?.total ?? 0;

    // ── Acción: exportar CSV ─────────────────────────────────────────────────
    const handleExportar = () => {
        if (!idEmpresa) return;
        const url = eventosService.getExportUrl(
            filters.filtrosAplicados,
            idEmpresa,
            API_BASE_URL,
        );
        window.open(url, "_blank");
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
            <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {/* Header */}
                <header className="border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Bell className="h-5 w-5 text-slate-500" aria-hidden="true" />
                            <h1 className="text-xl font-semibold text-slate-800">
                                Eventos de Geocerca
                            </h1>
                            {total > 0 && (
                                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                    {total.toLocaleString("es-MX")} eventos
                                </span>
                            )}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleExportar}
                            disabled={eventos.length === 0}
                        >
                            <Download className="h-4 w-4" />
                            Exportar CSV
                        </Button>
                    </div>
                </header>

                {/* Layout principal */}
                <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
                    <FiltersPanel
                        filters={{
                            ...filters,
                            aplicar: handleAplicar,
                            limpiarTodo: handleLimpiar,
                        }}
                        unidades={unidades}
                        pois={pois}
                    />

                    <section
                        className="flex-1 overflow-auto p-4 md:p-6"
                        aria-label="Resultados de eventos"
                    >
                        <EventosContent
                            isLoading={isLoading}
                            error={error}
                            onRetry={() => refetch()}
                            eventos={eventos}
                            total={total}
                            paginaActual={paginaActual}
                            totalPaginas={totalPaginas}
                            onPageChange={setPaginaActual}
                        />
                    </section>
                </div>
            </section>
        </main>
    );
};

// ── Sub-componente local: orquesta los estados de la zona de resultados ─────
// Lo separo para que el render del componente principal sea legible de un
// vistazo. No se exporta porque solo tiene sentido en este archivo.

interface EventosContentProps {
    isLoading: boolean;
    error: unknown;
    onRetry: () => void;
    eventos: ReturnType<typeof useEventosQuery>["data"] extends infer T
    ? T extends { eventos: infer E }
    ? E
    : never
    : never;
    total: number;
    paginaActual: number;
    totalPaginas: number;
    onPageChange: (page: number) => void;
}

const EventosContent = ({
    isLoading,
    error,
    onRetry,
    eventos,
    total,
    paginaActual,
    totalPaginas,
    onPageChange,
}: EventosContentProps) => {
    if (isLoading) {
        return (
            <TableSkeleton
                headers={["Fecha / Hora", "Unidad", "POI", "Evento", "Detalle"]}
                cols={5}
                rows={8}
            />
        );
    }

    if (error) {
        const c = clasificarError(error);
        return (
            <ErrorBanner
                kind={c.kind}
                message={c.message}
                fieldErrors={c.fieldErrors}
                onRetry={onRetry}
            />
        );
    }

    if (eventos.length === 0) {
        return <EmptyEventos />;
    }

    return (
        <>
            <p className="mb-3 text-xs text-slate-500">
                Mostrando{" "}
                <span className="font-medium text-slate-700">{eventos.length}</span> de{" "}
                <span className="font-medium text-slate-700">
                    {total.toLocaleString("es-MX")}
                </span>{" "}
                eventos
            </p>

            <EventsTable eventos={eventos} />

            <EventsPagination
                currentPage={paginaActual}
                totalPages={totalPaginas}
                onPageChange={onPageChange}
            />
        </>
    );
};

const EmptyEventos = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <FileText className="h-8 w-8 text-slate-400" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-slate-600">
            Sin eventos en el período seleccionado
        </p>
        <p className="mt-1 max-w-xs text-xs text-slate-400">
            Ajusta los filtros y vuelve a filtrar
        </p>
    </div>
);