import { useRef, useState } from "react";
import { MapPin, Search, X, MapPinned } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { poiService } from "@/features/catalogs/pois/poiService";
import type { PoiItem } from "@/features/catalogs/pois/poi.types";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useDebounce } from "@/components/shared";
import { useClickOutside } from "@/hooks/useClickOutside";
import { queryKeys } from "@/lib/query-keys";

interface PoiAddressInputProps {
    value: string;
    onChange: (address: string) => void;
    // Se llama cuando el usuario elige un POI del autocomplete (con ubicación)
    onPoiSelect?: (poi: PoiItem) => void;
    // Abre el selector completo de POIs (modal con tabla)
    onBrowsePois?: () => void;
    // Se llama al salir del campo con texto libre (no POI), para geocodificar
    onResolveText?: (address: string) => void;
    placeholder?: string;
    // Indica si este campo ya tiene un POI vinculado (para el estilo)
    vinculadoAPoi?: boolean;
}

export const PoiAddressInput = ({
    value,
    onChange,
    onPoiSelect,
    onBrowsePois,
    onResolveText,
    placeholder = "Busca una dirección o selecciona un POI",
    vinculadoAPoi = false,
}: PoiAddressInputProps) => {
    const { idEmpresa } = useEmpresaActiva();

    const [open, setOpen] = useState(false);
    // Marca si el último valor vino de elegir un POI (evita geocodificar al salir)
    const [pickedPoi, setPickedPoi] = useState(vinculadoAPoi);

    const wrapperRef = useRef<HTMLDivElement>(null);
    useClickOutside(wrapperRef, () => setOpen(false), open);

    const debounced = useDebounce(value, 300);

    const { data: pois = [] } = useQuery<PoiItem[]>({
        queryKey: queryKeys.pois.list(idEmpresa, debounced),
        queryFn: () => poiService.getPois(debounced, idEmpresa),
        enabled: open && !!idEmpresa && debounced.length >= 2,
        staleTime: 30_000,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);
        if (pickedPoi) setPickedPoi(false); // edición manual desvincula el POI
        setOpen(val.length >= 2);
    };

    const handlePickPoi = (poi: PoiItem) => {
        onChange(poi.direccion ?? poi.nombre);
        setPickedPoi(true);
        onPoiSelect?.(poi);
        setOpen(false);
    };

    const handleBlur = () => {
        // Si hay texto libre (no POI) y un handler, geocodificar al salir.
        // Pequeño delay para no interferir con el click en una sugerencia.
        setTimeout(() => {
            if (!pickedPoi && value.trim() && onResolveText) {
                onResolveText(value.trim());
            }
        }, 200);
    };

    const handleClear = () => {
        onChange("");
        setPickedPoi(false);
        setOpen(false);
    };

    const results = pois
        .filter((p) => p.lat !== null && p.lng !== null)
        .slice(0, 8);

    return (
        <div ref={wrapperRef} className="relative">
            <div className="flex items-center gap-2">
                {/* Campo con ícono y botón limpiar */}
                <div className="relative flex flex-1 items-center">
                    <span className="pointer-events-none absolute left-3 text-slate-400">
                        {pickedPoi ? <MapPin className="h-4 w-4 text-cyan-500" /> : <Search className="h-4 w-4" />}
                    </span>

                    <input
                        type="text"
                        value={value}
                        onChange={handleInputChange}
                        onFocus={() => value.length >= 2 && setOpen(true)}
                        onBlur={handleBlur}
                        placeholder={placeholder}
                        className={`w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm outline-none focus:border-cyan-400 ${pickedPoi ? "border-cyan-300 bg-cyan-50/40" : ""
                            }`}
                    />

                    {value && (
                        <button
                            type="button"
                            onClick={handleClear}
                            aria-label="Limpiar dirección"
                            className="absolute right-2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Botón para abrir el selector completo de POIs */}
                {onBrowsePois && (
                    <button
                        type="button"
                        onClick={onBrowsePois}
                        title="Seleccionar desde la lista de POIs"
                        className="flex h-[38px] shrink-0 items-center gap-1.5 rounded border border-cyan-300 bg-cyan-50 px-3 text-sm font-medium text-cyan-700 hover:bg-cyan-100"
                    >
                        <MapPinned className="h-4 w-4" />
                        POI
                    </button>
                )}
            </div>

            {/* Dropdown de sugerencias del autocomplete */}
            {open && results.length > 0 && (
                <ul
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
                >
                    {results.map((poi) => (
                        <li key={poi.id_poi}>
                            <button
                                type="button"
                                role="option"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handlePickPoi(poi)}
                                className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
                            >
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-700">{poi.nombre}</p>
                                    {poi.direccion && (
                                        <p className="truncate text-xs text-slate-400">{poi.direccion}</p>
                                    )}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};