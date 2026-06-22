import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Check, ChevronRight, ChevronLeft, Search, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useNotificationStore } from "@/stores/notificationStore";
import { queryKeys } from "@/lib/query-keys";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { itineraryGroupService } from "../services/itineraryGroupService";
import { itineraryService } from "../../services/itineraryService";
import { formatWeekdaySummary } from "../../lib/weekday-summary";
import type { ItineraryGroupDetail } from "../types/itinerary-group.types";
import type { DiaSemana, ItinerarioItem } from "../../types/itinerary.types";

interface GroupTransferModalProps {
    group: ItineraryGroupDetail | null;
    onClose: () => void;
}

// ── Item de la lista de transferencia ────────────────────────────────────────

const TransferItem = ({
    item,
    inGroup,
    onToggle,
}: {
    item: ItinerarioItem;
    inGroup: boolean;
    onToggle: (id: number) => void;
}) => (
    <div
        className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 hover:border-slate-200 hover:bg-slate-50"
    >
        <div className="min-w-0 flex-1">
            {/* Turno + sentido */}
            <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-800">
                    Turno {item.turno}
                </span>
                <span className={[
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    item.tipo_logistica === 2
                        ? "bg-violet-50 text-violet-700"
                        : "bg-emerald-50 text-emerald-700",
                ].join(" ")}>
                    {item.tipo_logistica === 2 ? "Vuelta" : "Ida"}
                </span>
            </div>
            {/* Ruta */}
            <p className="truncate text-xs text-slate-500">{item.nombre_ruta ?? `Ruta ${item.id_ruta}`}</p>
            {/* Días resumidos */}
            <p className="text-xs text-slate-400">
                {formatWeekdaySummary((item.dias ?? []) as DiaSemana[])}
                {item.hora_inicio && item.hora_fin && (
                    <span className="ml-2">{item.hora_inicio}–{item.hora_fin}</span>
                )}
            </p>
        </div>

        <button
            type="button"
            onClick={() => onToggle(item.id_itinerario)}
            className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                inGroup
                    ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                    : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
            ].join(" ")}
            title={inGroup ? "Quitar del grupo" : "Agregar al grupo"}
            aria-label={inGroup ? `Quitar turno ${item.turno} del grupo` : `Agregar turno ${item.turno} al grupo`}
        >
            {inGroup ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        </button>
    </div>
);

// ── Panel de búsqueda ─────────────────────────────────────────────────────────

const SearchInput = ({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) => {
    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
        [onChange],
    );
    const handleClear = useCallback(() => onChange(""), [onChange]);

    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
                type="text"
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
            />
            {value && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
};

// ── Modal principal ───────────────────────────────────────────────────────────

export const GroupTransferModal = ({
    group,
    onClose,
}: GroupTransferModalProps) => {
    const { idEmpresa } = useEmpresaActiva();
    const queryClient = useQueryClient();
    const notify = useNotificationStore((s) => s.addNotification);

    const [inGroupIds, setInGroupIds] = useState<Set<number>>(new Set());
    const [searchLeft, setSearchLeft] = useState("");
    const [searchRight, setSearchRight] = useState("");
    const [isDirty, setIsDirty] = useState(false);

    // Cargar todos los itinerarios de la empresa
    const { data: allItinerarios = [], isLoading } = useQuery({
        queryKey: [...queryKeys.operation.itineraries(idEmpresa, ""), "transfer-modal"],
        queryFn: () => itineraryService.listGrouped(idEmpresa, "").then((grupos) =>
            grupos.flatMap((g) =>
                g.itinerarios.map((i) => ({
                    ...i,
                    dias: (Array.isArray(i.dias)
                        ? i.dias
                        : String(i.dias ?? "").split(" ").map(Number).filter((n) => !isNaN(n))
                    ) as import("../../types/itinerary.types").DiaSemana[],
                    // Garantizar que id_itinerario sea siempre número
                    id_itinerario: Number(i.id_itinerario),
                }))
            )
        ),
        enabled: !!idEmpresa && !!group,
        staleTime: 30_000,
    });

    // Inicializar el set cuando cambia el grupo
    const prevGroupIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!group) return;
        if (group.id_grupo_itinerarios !== prevGroupIdRef.current) {
            prevGroupIdRef.current = group.id_grupo_itinerarios;
            setInGroupIds(new Set(group.id_itinerarios.map(Number)));
            setIsDirty(false);
        }
    }, [group]);

    // Handlers estables para evitar re-renders infinitos en SearchInput
    const handleSearchLeft = useCallback((v: string) => setSearchLeft(v), []);
    const handleSearchRight = useCallback((v: string) => setSearchRight(v), []);

    // Filtrado de cada panel
    const filterFn = useCallback((items: ItinerarioItem[], search: string) => {
        if (!search.trim()) return items;
        const s = search.toLowerCase();
        return items.filter(
            (i) =>
                (i.turno ?? "").toLowerCase().includes(s) ||
                (i.nombre_ruta ?? "").toLowerCase().includes(s) ||
                String(i.id_itinerario).includes(s),
        );
    }, []);

    const outsideItems = useMemo(
        () => filterFn(
            allItinerarios.filter((i) => !inGroupIds.has(Number(i.id_itinerario))),
            searchLeft,
        ),
        [allItinerarios, inGroupIds, searchLeft, filterFn],
    );

    const insideItems = useMemo(
        () => filterFn(
            allItinerarios.filter((i) => inGroupIds.has(Number(i.id_itinerario))),
            searchRight,
        ),
        [allItinerarios, inGroupIds, searchRight, filterFn],
    );

    const totalInGroup = allItinerarios.filter((i) => inGroupIds.has(Number(i.id_itinerario))).length;

    const toggle = useCallback((id: number) => {
        setInGroupIds((prev) => {
            const next = new Set(prev);
            const numId = Number(id);
            if (next.has(numId)) next.delete(numId);
            else next.add(numId);
            return next;
        });
        setIsDirty(true);
    }, []);

    const addAll = useCallback(() => {
        setInGroupIds(new Set(allItinerarios.map((i) => Number(i.id_itinerario))));
        setIsDirty(true);
    }, [allItinerarios]);

    const removeAll = useCallback(() => {
        setInGroupIds(new Set());
        setIsDirty(true);
    }, []);

    // Guardar cambios
    const mutation = useMutation({
        mutationFn: () =>
            itineraryGroupService.updateGroup(
                group!.id_grupo_itinerarios,
                { id_itinerarios: Array.from(inGroupIds).map(Number) },
                idEmpresa,
            ),
        onSuccess: () => {
            notify({ type: "success", message: "Grupo actualizado correctamente" });
            queryClient.invalidateQueries({ queryKey: queryKeys.operation.itineraryGroupsAll });
            setIsDirty(false);
            onClose();
        },
        onError: (err) => {
            notify({
                type: "error",
                message: err instanceof Error ? err.message : "Error al guardar",
            });
        },
    });

    if (!group) return null;

    return (
        <Dialog open={!!group} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4">
                    <DialogTitle className="text-lg font-semibold text-slate-800">
                        Itinerarios del grupo
                    </DialogTitle>
                    <p className="text-sm text-slate-500">
                        <span className="font-medium text-slate-700">{group.nombre}</span>
                        {group.observaciones && (
                            <span className="ml-2 text-slate-400">· {group.observaciones}</span>
                        )}
                    </p>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" />
                    </div>
                ) : (
                    <div className="flex min-h-0 flex-1 gap-0">
                        {/* Panel izquierdo — Disponibles */}
                        <div className="flex min-h-0 flex-1 flex-col border-r border-slate-200">
                            <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-slate-700">
                                        Disponibles
                                        <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                                            {allItinerarios.length - totalInGroup}
                                        </span>
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addAll}
                                        disabled={allItinerarios.length === totalInGroup}
                                        className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-40"
                                        title="Agregar todos al grupo"
                                    >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                        Agregar todos
                                    </button>
                                </div>
                                <SearchInput
                                    value={searchLeft}
                                    onChange={handleSearchLeft}
                                    placeholder="Buscar disponibles..."
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                                {outsideItems.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-slate-400">
                                        {searchLeft ? "Sin resultados" : "Todos los itinerarios están en el grupo"}
                                    </p>
                                ) : (
                                    outsideItems.map((item) => (
                                        <TransferItem
                                            key={item.id_itinerario}
                                            item={item}
                                            inGroup={false}
                                            onToggle={toggle}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Panel derecho — En el grupo */}
                        <div className="flex min-h-0 flex-1 flex-col">
                            <div className="shrink-0 border-b border-slate-100 bg-sky-50 px-4 py-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-sky-700">
                                        En el grupo
                                        <span className="ml-2 rounded-full bg-sky-200 px-2 py-0.5 text-xs font-medium text-sky-700">
                                            {totalInGroup}
                                        </span>
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={removeAll}
                                        disabled={totalInGroup === 0}
                                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-40"
                                        title="Quitar todos del grupo"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                        Quitar todos
                                    </button>
                                </div>
                                <SearchInput
                                    value={searchRight}
                                    onChange={handleSearchRight}
                                    placeholder="Buscar en el grupo..."
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                                {insideItems.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-slate-400">
                                        {searchRight ? "Sin resultados" : "El grupo está vacío"}
                                    </p>
                                ) : (
                                    insideItems.map((item) => (
                                        <TransferItem
                                            key={item.id_itinerario}
                                            item={item}
                                            inGroup={true}
                                            onToggle={toggle}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="shrink-0 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        {isDirty ? (
                            <span className="font-medium text-amber-600">Hay cambios sin guardar</span>
                        ) : (
                            <span className="text-slate-400">Sin cambios pendientes</span>
                        )}
                    </p>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => mutation.mutate()}
                            disabled={!isDirty || mutation.isPending}
                            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                        >
                            {mutation.isPending ? "Guardando..." : "Guardar cambios"}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};