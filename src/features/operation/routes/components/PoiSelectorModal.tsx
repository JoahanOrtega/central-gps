// Modal para seleccionar un Punto de Interés existente y usarlo como parada
// de una ruta. Basado en la "Lista de Puntos de Interés" de la v2.5.
//
// Al seleccionar un POI, se copia su información (nombre, dirección,
// coordenadas, geocerca) a una nueva parada — copia independiente: si el
// POI cambia después, la parada NO se actualiza. Guardamos id_poi solo
// como referencia de origen.

import { useState } from "react";
import { Check, Search, X, MapPinned } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { poiService } from "@/features/catalogs/pois/services/poiService";
import type { PoiItem } from "@/features/catalogs/pois/types/poi.types";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useDebounce } from "@/components/shared";
import { queryKeys } from "@/lib/query-keys";
import type { Parada } from "../types/route.types";

interface PoiSelectorModalProps {
    open: boolean;
    onClose: () => void;
    // Se llama con la parada ya construida a partir del POI elegido
    onSelect: (parada: Omit<Parada, "numero">) => void;
}

// Mapea el tipo_poi del POI (1=circular/marcador, 2=poligonal) al
// tipo_geocerca de la parada.
const tipoPoiToGeocerca = (tipoPoi: number): Parada["tipo_geocerca"] =>
    tipoPoi === 2 ? "poligonal" : "circular";

// Parsea el polygon_path del POI (JSON "[[lat,lng],...]") a LatLng[]
const parsePolygon = (polygonPath: string | null) => {
    if (!polygonPath) return undefined;
    try {
        const parsed = JSON.parse(polygonPath);
        if (!Array.isArray(parsed)) return undefined;
        return parsed
            .map((p: unknown) => {
                if (Array.isArray(p) && p.length >= 2) return { lat: Number(p[0]), lng: Number(p[1]) };
                if (p && typeof p === "object" && "lat" in p && "lng" in p) {
                    return { lat: Number((p as { lat: number }).lat), lng: Number((p as { lng: number }).lng) };
                }
                return null;
            })
            .filter((p): p is { lat: number; lng: number } => p !== null);
    } catch {
        return undefined;
    }
};

export const PoiSelectorModal = ({ open, onClose, onSelect }: PoiSelectorModalProps) => {
    const { idEmpresa } = useEmpresaActiva();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search);

    const { data: pois = [], isLoading } = useQuery<PoiItem[]>({
        queryKey: queryKeys.pois.list(idEmpresa, debouncedSearch),
        queryFn: () => poiService.getPois(debouncedSearch, idEmpresa),
        enabled: open && !!idEmpresa,
    });

    const handlePick = (poi: PoiItem) => {
        // Copia independiente: tomamos los datos del POI ahora mismo
        const parada: Omit<Parada, "numero"> = {
            id: `poi-${poi.id_poi}-${Date.now()}`,
            nombre: poi.nombre,
            direccion: poi.direccion ?? "",
            latitud: poi.lat ?? 0,
            longitud: poi.lng ?? 0,
            tipo_geocerca: tipoPoiToGeocerca(poi.tipo_poi),
            radio: poi.radio ?? 100,
            poligono: parsePolygon(poi.polygon_path),
            id_poi: poi.id_poi, // referencia de origen
        };
        onSelect(parada);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-3xl gap-0 p-0">
                <DialogHeader className="border-b border-slate-200 px-5 py-4">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <MapPinned className="h-5 w-5 text-cyan-600" />
                        Seleccionar Punto de Interés
                    </DialogTitle>
                    <DialogDescription>
                        Elige un punto de interés para usarlo como parada. Sus datos se copiarán a la ruta.
                    </DialogDescription>
                </DialogHeader>

                {/* Buscador */}
                <div className="border-b border-slate-100 px-5 py-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre o dirección..."
                            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-400"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Tabla de POIs */}
                <div className="max-h-[55vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="py-12 text-center text-sm text-slate-500">Cargando puntos de interés...</div>
                    ) : pois.length === 0 ? (
                        <div className="py-12 text-center text-sm text-slate-500">
                            {debouncedSearch
                                ? `No se encontraron POIs que coincidan con "${debouncedSearch}".`
                                : "No hay puntos de interés registrados."}
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                                <tr>
                                    <th className="px-4 py-2 font-medium">#</th>
                                    <th className="px-4 py-2 font-medium">Nombre</th>
                                    <th className="px-4 py-2 font-medium">Dirección</th>
                                    <th className="px-4 py-2 font-medium">Coordenadas</th>
                                    <th className="px-4 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {pois.map((poi, index) => (
                                    <tr key={poi.id_poi} className="border-t border-slate-100 hover:bg-slate-50">
                                        <td className="px-4 py-2.5 text-slate-400">{index + 1}</td>
                                        <td className="px-4 py-2.5 font-medium text-slate-700">{poi.nombre}</td>
                                        <td className="max-w-xs px-4 py-2.5 text-slate-500">{poi.direccion || "---"}</td>
                                        <td className="px-4 py-2.5 text-xs text-slate-400">
                                            {poi.lat !== null && poi.lng !== null
                                                ? `${poi.lat.toFixed(6)}, ${poi.lng.toFixed(6)}`
                                                : "Sin ubicar"}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <button
                                                type="button"
                                                onClick={() => handlePick(poi)}
                                                disabled={poi.lat === null || poi.lng === null}
                                                aria-label={`Seleccionar ${poi.nombre}`}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-40"
                                                title={poi.lat === null ? "Este POI no tiene ubicación" : "Usar como parada"}
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t border-slate-200 px-5 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                        <X className="h-4 w-4" />
                        Cerrar
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};