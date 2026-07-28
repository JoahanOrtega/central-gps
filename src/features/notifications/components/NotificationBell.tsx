import { useNavigate } from "react-router-dom";
import { Bell, SatelliteDish, CheckCheck, Inbox } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { formatElapsedTimeFromApiDate } from "@/lib/date-time";
import { cn } from "@/lib/utils";
import {
    useMarcarLeidas,
    useNotificaciones,
} from "../hooks/useNotificaciones";
import type { NotificacionItem } from "../notification.types";

// Icono por tipo de notificación. Al crecer el catálogo (geocercas,
// excesos...) se agregan entradas aquí — un solo lugar.
const iconoPorTipo = (tipo: number) => {
    if (tipo === 21) return SatelliteDish;
    return Bell;
};

/**
 * Campanita de notificaciones persistentes — patrón Gmail/Slack:
 * badge con conteo de no leídas, panel con las últimas 20, punto azul en
 * las pendientes, "Marcar todas" y click que lleva a la unidad en el mapa.
 *
 * La frescura llega por dos vías: invalidación desde el WS (en vivo) y un
 * refetch de respaldo cada 60s (cubre sockets caídos).
 */
export const NotificationBell = () => {
    const navigate = useNavigate();
    const { data, isLoading } = useNotificaciones();
    const marcar = useMarcarLeidas();

    const noLeidas = data?.no_leidas ?? 0;
    const items = data?.items ?? [];

    const onClickNotificacion = (n: NotificacionItem) => {
        if (!n.leida) marcar.mutate([n.id]);

        if (n.id_unidad) {
            // ?unidad= activa el deep-link en useMapsDeepLink:
            // el mapa centra la unidad y abre el drawer automáticamente.
            navigate(`/home/maps?unidad=${n.id_unidad}`);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <IconButton
                    label={
                        noLeidas > 0
                            ? `Notificaciones (${noLeidas} sin leer)`
                            : "Notificaciones"
                    }
                    className="relative rounded-full border-transparent bg-transparent"
                >
                    <Bell className="h-5 w-5" />
                    {noLeidas > 0 && (
                        <span
                            aria-hidden
                            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
                        >
                            {noLeidas > 9 ? "9+" : noLeidas}
                        </span>
                    )}
                </IconButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80 p-0">
                {/* Header con acción global */}
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                    <span className="text-sm font-semibold text-slate-800">
                        Notificaciones
                    </span>
                    {noLeidas > 0 && (
                        <button
                            type="button"
                            onClick={() => marcar.mutate(undefined)}
                            className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700"
                        >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Marcar todas
                        </button>
                    )}
                </div>

                {/* Lista */}
                <div className="max-h-96 overflow-y-auto">
                    {isLoading && (
                        <p className="px-4 py-6 text-center text-sm text-slate-400">
                            Cargando…
                        </p>
                    )}

                    {!isLoading && items.length === 0 && (
                        <div className="flex flex-col items-center gap-2 px-4 py-8 text-slate-400">
                            <Inbox className="h-8 w-8" />
                            <p className="text-sm">Sin notificaciones</p>
                        </div>
                    )}

                    {items.map((n) => {
                        const Icono = iconoPorTipo(n.tipo);
                        return (
                            <button
                                key={n.id}
                                type="button"
                                onClick={() => onClickNotificacion(n)}
                                className={cn(
                                    "flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                                    !n.leida && "bg-sky-50/60",
                                )}
                            >
                                <span
                                    className={cn(
                                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                                        n.leida
                                            ? "bg-slate-100 text-slate-400"
                                            : "bg-sky-100 text-sky-600",
                                    )}
                                >
                                    <Icono className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span
                                        className={cn(
                                            "block truncate text-sm text-slate-800",
                                            !n.leida && "font-semibold",
                                        )}
                                    >
                                        {n.titulo}
                                    </span>
                                    <span className="block text-xs text-slate-400">
                                        hace{" "}
                                        {formatElapsedTimeFromApiDate(n.fecha)}
                                    </span>
                                </span>
                                {/* Punto de no-leída (patrón Gmail) */}
                                {!n.leida && (
                                    <span
                                        aria-hidden
                                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-500"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};