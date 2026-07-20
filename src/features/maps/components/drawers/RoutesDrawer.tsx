import { KebabMenu } from "@/components/shared";
import { EditRouteModal } from "@/features/operation/routes/components/EditRouteModal";
import { routeService } from "@/features/operation/routes/services/routeService";
import type { RouteItem } from "@/features/operation/routes/types/route.types";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { usePermiso } from "@/hooks/usePermiso";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, GitBranch, Pencil, Search, X } from "lucide-react";
import { useState } from "react";

interface RoutesDrawerProps {
    onClose: () => void;
    selectedRouteIds: number[];
    onRouteToggle: (idRuta: number, checked: boolean) => Promise<void>;
}

export const RoutesDrawer = ({
    onClose,
    selectedRouteIds,
    onRouteToggle,
}: RoutesDrawerProps) => {

    const { idEmpresa } = useEmpresaActiva();
    const puedeEditar = usePermiso("rutas.editar");

    const [search, setSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [open, setOpen] = useState(true);
    const [loadingRouteIds, setLoadingRouteIds] = useState<number[]>([]);

    // Estados para menu interno del drawer de rutas
    const [editingRouteId, setEditingRouteId] = useState<number | null>(null);

    const {
        data: routes = [],
        isLoading,
        error,
        refetch,
    } = useQuery<RouteItem[]>({
        queryKey: queryKeys.operation.routes(idEmpresa, appliedSearch),
        queryFn: () => routeService.list(appliedSearch, idEmpresa),
        enabled: !!idEmpresa,
    });

    const handleSearch = () => {
        const value = search.trim();

        if (value === appliedSearch) {
            void refetch();
        } else {
            setAppliedSearch(value);
        }
    };

    const handleRouteToggle = async (idRuta: number, checked: boolean) => {
        setLoadingRouteIds((current) => [...current, idRuta]);
        try {
            await onRouteToggle(idRuta, checked);
        } finally {
            setLoadingRouteIds((current) =>
                current.filter((loadingId) => loadingId !== idRuta),
            );
        }
    };

    return (
        <>
            <aside className="absolute inset-x-0 bottom-0 top-auto z-20 flex h-[55vh] flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:h-auto md:w-[380px] md:rounded-xl">
                <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-300 md:hidden" />

                <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-slate-500" />
                        <h2 className="text-sm font-semibold text-slate-800">
                            Rutas
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        title="Cerrar"
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </header>

                <div className="border-b border-slate-200 px-3 py-3">
                    <div className="relative flex gap-2">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") handleSearch();
                            }}
                            placeholder="Clave o nombre..."
                            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
                        />

                        <button
                            type="button"
                            onClick={handleSearch}
                            className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                        >
                            Buscar
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {isLoading && (
                        <p className="px-3 py-8 text-center text-sm text-slate-400">
                            Cargando rutas...
                        </p>
                    )}

                    {!isLoading && error && (
                        <div className="px-3 py-8 text-center">
                            <p className="text-sm text-red-500">
                                No fue posible cargar las rutas
                            </p>
                            <button
                                type="button"
                                onClick={() => void refetch()}
                                className="mt-3 text-sm text-emerald-600 hover:underline"
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    {!isLoading && !error && routes.length === 0 && (
                        <p className="px-3 py-8 text-center text-sm text-slate-400">
                            {appliedSearch
                                ? `Sin resultados para "${appliedSearch}"`
                                : "No hay rutas registradas"}
                        </p>
                    )}

                    {!isLoading && !error && routes.length > 0 && (
                        <div className="m-2 overflow-hidden rounded-lg border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setOpen((value) => !value)}
                                className="flex w-full items-center gap-2 bg-slate-50 px-3 py-2 text-left"
                            >
                                <span className="flex-1 text-xs font-semibold text-slate-700">Rutas</span>
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold">
                                    {routes.length}
                                </span>
                                <ChevronDown className={`h-4 w-4 ${open ? "" : "-rotate-90"}`} />
                            </button>

                            {open && routes.map((route) => (
                                <div
                                    key={route.id_ruta}
                                    className="flex items-center gap-3 border-t border-slate-100 px-3 py-2"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedRouteIds.includes(route.id_ruta)}
                                        disabled={loadingRouteIds.includes(route.id_ruta)}
                                        onChange={(event) =>
                                            void handleRouteToggle(
                                                route.id_ruta,
                                                event.target.checked,
                                            )
                                        }
                                        className="h-4 w-4 cursor-pointer accent-emerald-500 disabled:cursor-wait disabled:opacity-50"
                                    />

                                    <GitBranch className="h-4 w-4 shrink-0 text-slate-500" />

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-semibold text-slate-700">
                                            {route.clave} · {route.nombre}
                                        </p>
                                        <p className="truncate text-[10px] text-slate-400">
                                            {route.cliente || "Sin cliente"} · {route.total_paradas} paradas
                                        </p>
                                    </div>

                                    <KebabMenu
                                        entityName={`ruta ${route.nombre}`}
                                        items={[
                                            ...(puedeEditar
                                                ? [{
                                                    id: "edit",
                                                    label: "Editar",
                                                    icon: Pencil,
                                                    onClick: () => setEditingRouteId(route.id_ruta),
                                                }]
                                                : []),
                                        ]}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </aside>

            <EditRouteModal
                idRuta={editingRouteId}
                onClose={() => setEditingRouteId(null)}
                onSuccess={() => {
                    setEditingRouteId(null);
                    void refetch();
                }}
            />
        </>
    );
};
