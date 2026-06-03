import { useEffect, useState } from "react";
import { Route as RouteIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { routeService } from "./routeService";
import type { CreateRoutePayload, Logistica, Route, TipoRuta } from "./route.types";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { notify } from "@/stores/notificationStore";
import { queryKeys } from "@/lib/query-keys";
import { ModalWithTabs } from "@/components/shared/ModalWithTabs";
import { RouteInfoTab } from "./tabs/RouteInfoTab";
import { RouteLogisticaTab } from "./tabs/RouteLogisticaTab";

interface EditRouteModalProps {
    // id de la ruta a editar; null = cerrado
    idRuta: number | null;
    onClose: () => void;
    onSuccess: () => void;
}

// Logística vacía para inicializar el sentido que falte
const emptyLogistica = (tipo: 1 | 2): Logistica => ({
    tipo_logistica: tipo,
    direccion_inicio: "",
    direccion_fin: "",
    fecha_inicio: null,
    tiempo_recorrido_min: null,
    kilometros: null,
    path: [],
    paradas: [],
});

interface RouteForm {
    clave: string;
    nombre: string;
    tipo: TipoRuta | "";
    id_cliente: number | null;
    observaciones: string;
    id_grupo_rutas: number[];
    tieneVuelta: boolean;
    logisticaAB: Logistica;
    logisticaBA: Logistica;
}

// Convierte la ruta que llega del backend al estado del formulario
const routeToForm = (route: Route): RouteForm => {
    const ab = route.logisticas.find((l) => l.tipo_logistica === 1) ?? emptyLogistica(1);
    const ba = route.logisticas.find((l) => l.tipo_logistica === 2);

    return {
        clave: route.clave ?? "",
        nombre: route.nombre,
        tipo: route.tipo,
        id_cliente: route.id_cliente,
        observaciones: route.observaciones ?? "",
        id_grupo_rutas: route.id_grupo_rutas ?? [],
        tieneVuelta: Boolean(ba),
        logisticaAB: ab,
        logisticaBA: ba ?? emptyLogistica(2),
    };
};

export const EditRouteModal = ({ idRuta, onClose, onSuccess }: EditRouteModalProps) => {
    const { idEmpresa } = useEmpresaActiva();

    const [form, setForm] = useState<RouteForm | null>(null);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("info");
    const [isLoading, setIsLoading] = useState(false);

    // Cargar la ruta completa cuando se abre el modal
    const { data: route, isLoading: cargando, error: errorCarga } = useQuery<Route>({
        queryKey: queryKeys.operation.routeDetail(idRuta ?? 0, idEmpresa),
        queryFn: () => routeService.getById(idRuta!, idEmpresa),
        enabled: idRuta !== null && !!idEmpresa,
    });

    // Sincronizar el formulario cuando llega la ruta
    useEffect(() => {
        if (route) {
            setForm(routeToForm(route));
            setActiveTab("info");
            setError("");
        }
    }, [route]);

    const handleReset = () => {
        if (route) setForm(routeToForm(route)); // volver a los datos originales
        setError("");
        setActiveTab("info");
    };

    const handleSubmit = async () => {
        if (!form) return;
        setError("");

        if (!form.nombre.trim()) {
            setError("El nombre de la ruta es requerido");
            setActiveTab("info");
            return;
        }
        if (!form.tipo) {
            setError("Selecciona el tipo de ruta");
            setActiveTab("info");
            return;
        }
        if (form.logisticaAB.path.length === 0) {
            setError("La logística de ida (A-B) necesita un trazo. Súbelo desde un KML o dibújalo en el mapa.");
            setActiveTab("logistica-ab");
            return;
        }

        const logisticas: Logistica[] = [form.logisticaAB];
        if (form.tieneVuelta && form.logisticaBA.path.length > 0) {
            logisticas.push(form.logisticaBA);
        }

        const payload: CreateRoutePayload = {
            clave: form.clave.trim(),
            nombre: form.nombre.trim(),
            tipo: form.tipo,
            id_cliente: form.id_cliente,
            observaciones: form.observaciones.trim() || null,
            id_grupo_rutas: form.id_grupo_rutas,
            id_empresa: idEmpresa ?? undefined,
            logisticas,
        };

        setIsLoading(true);
        try {
            await routeService.update(idRuta!, payload);
            notify.success(`Ruta "${form.nombre}" actualizada correctamente`);
            onSuccess();
            onClose();
        } catch (err) {
            if (err instanceof Error && err.message.includes("CLAVE_TAKEN")) {
                setError("Ya existe una ruta con esa clave en tu empresa");
                setActiveTab("info");
                return;
            }
            setError(err instanceof Error ? err.message : "No fue posible actualizar la ruta");
        } finally {
            setIsLoading(false);
        }
    };

    // Mientras carga o si no hay form aún, mostramos un modal mínimo con estado
    const tabs = form
        ? [
            {
                id: "info",
                label: "Info. General",
                content: (
                    <RouteInfoTab
                        form={form}
                        onChange={(patch) => setForm((prev) => (prev ? { ...prev, ...patch } : prev))}
                    />
                ),
            },
            {
                id: "logistica-ab",
                label: "Logística A-B (Entrada)",
                content: (
                    <RouteLogisticaTab
                        logistica={form.logisticaAB}
                        onChange={(log) => setForm((prev) => (prev ? { ...prev, logisticaAB: log } : prev))}
                    />
                ),
            },
            ...(form.tieneVuelta
                ? [{
                    id: "logistica-ba",
                    label: "Logística B-A (Salida)",
                    content: (
                        <RouteLogisticaTab
                            logistica={form.logisticaBA}
                            onChange={(log) => setForm((prev) => (prev ? { ...prev, logisticaBA: log } : prev))}
                        />
                    ),
                }]
                : []),
        ]
        : [
            {
                id: "info",
                label: "Info. General",
                content: (
                    <div className="flex items-center justify-center py-16 text-sm text-slate-500">
                        {cargando && "Cargando ruta..."}
                        {errorCarga && "No se pudo cargar la ruta. Intenta de nuevo."}
                    </div>
                ),
            },
        ];

    return (
        <ModalWithTabs
            open={idRuta !== null}
            onOpenChange={(open) => !open && onClose()}
            title="Editar Ruta"
            icon={RouteIcon}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSave={handleSubmit}
            onReset={handleReset}
            isLoading={isLoading || cargando}
            saveLabel="Guardar cambios"
            error={error}
            confirmCloseDescription="Si cierras, perderás los cambios sin guardar. ¿Deseas cerrar?"
        />
    );
};