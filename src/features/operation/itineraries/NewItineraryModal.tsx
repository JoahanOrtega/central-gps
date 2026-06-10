import { useState, useEffect, useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useNotificationStore } from "@/stores/notificationStore";
import { queryKeys } from "@/lib/query-keys";
import { ApiError } from "@/lib/api";
import { ModalWithTabs, type ModalTab } from "@/components/shared";
import { Label } from "@/components/ui/label";

import { itineraryService } from "./itineraryService";
import { routeService } from "@/features/operation/routes/routeService";
import type {
    CreateItinerarioPayload,
    ParadaItinerario,
} from "./itinerary.types";
import {
    GeneralStep,
    StopsStep,
    isGeneralStepComplete,
    type ItineraryFormState,
} from "./ItineraryFormTabs.tsx";

interface NewItineraryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    preselectedIdRuta?: number | null;
}

const INITIAL_STATE: ItineraryFormState = {
    turno: "",
    tipo: 1,
    dias: [1, 2, 3, 4, 5],
    horaInicio: "",
    horaFin: "",
    tolInicio: 30,
    tolFin: 0,
    tolAnticip: 10,
    fechaInicio: "",
    paradas: [],
};

export const NewItineraryModal = ({
    open,
    onOpenChange,
    onSuccess,
    preselectedIdRuta = null,
}: NewItineraryModalProps) => {
    const { idEmpresa } = useEmpresaActiva();
    const notify = useNotificationStore((s) => s.addNotification);

    const [activeTab, setActiveTab] = useState("general");
    const [idRuta, setIdRuta] = useState<number | "">(preselectedIdRuta ?? "");
    const [idLogistica, setIdLogistica] = useState<number | "">("");
    const [form, setForm] = useState<ItineraryFormState>(INITIAL_STATE);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const patchForm = (patch: Partial<ItineraryFormState>) =>
        setForm((prev) => ({ ...prev, ...patch }));

    // ── Datos remotos ───────────────────────────────────────────────────────────

    const { data: rutas = [] } = useQuery({
        queryKey: queryKeys.operation.routes(idEmpresa, ""),
        queryFn: () => routeService.list("", idEmpresa),
        enabled: !!idEmpresa && open,
    });

    const { data: rutaDetalle } = useQuery({
        queryKey: queryKeys.operation.routeDetail(Number(idRuta), idEmpresa),
        queryFn: () => routeService.getById(Number(idRuta), idEmpresa),
        enabled: !!idRuta && !!idEmpresa && open,
    });

    const logisticas = rutaDetalle?.logisticas ?? [];

    // ── Efectos de sincronización ───────────────────────────────────────────────

    // Cambio de ruta → limpiar logística y paradas
    useEffect(() => {
        setIdLogistica("");
        patchForm({ paradas: [] });
    }, [idRuta]);

    // Selección de logística → inicializar paradas CON NOMBRE
    useEffect(() => {
        if (!idLogistica || !rutaDetalle) return;
        const log = rutaDetalle.logisticas.find(
            (l) => l.id_logistica_ruta === Number(idLogistica),
        );
        if (!log) return;
        patchForm({
            paradas: log.paradas.map((p): ParadaItinerario => ({
                id_parada: Number(p.id),
                hora_abordaje: null,
                segundos_recorrido_continuo: null,
                segundos_recorrido_mixto: null,
                // Campos de UI — el usuario ve el nombre real, no "Parada N"
                nombre: p.nombre,
                numero: p.numero,
                latitud: p.latitud,
                longitud: p.longitud,
            })),
        });
    }, [idLogistica, rutaDetalle]);

    // Reset al cerrar
    useEffect(() => {
        if (!open) {
            setActiveTab("general");
            setIdRuta(preselectedIdRuta ?? "");
            setIdLogistica("");
            setForm(INITIAL_STATE);
            setFieldErrors({});
        }
    }, [open, preselectedIdRuta]);

    // ── Guardado ────────────────────────────────────────────────────────────────

    const mutation = useMutation({
        mutationFn: (payload: CreateItinerarioPayload) =>
            itineraryService.create(payload, idEmpresa),
        onSuccess: () => {
            notify({
                type: "success",
                message: `Turno "${form.turno}" creado correctamente`,
            });
            onSuccess();
        },
        onError: (err) => {
            if (err instanceof ApiError && err.fieldErrors) {
                setFieldErrors(err.fieldErrors);
                setActiveTab("general"); // los errores de campos viven en el paso 1
            } else {
                notify({
                    type: "error",
                    message: err instanceof Error ? err.message : "Error al crear el itinerario",
                });
            }
        },
    });

    const handleSave = () => {
        setFieldErrors({});

        if (!idRuta || !idLogistica || !form.turno.trim()) {
            setFieldErrors({
                ...((!form.turno.trim()) && { turno: "El código de turno es requerido" }),
                ...((!idRuta) && { id_ruta: "Selecciona una ruta" }),
                ...((!idLogistica) && { id_logistica_ruta: "Selecciona un sentido" }),
            });
            setActiveTab("general");
            return;
        }

        // Excluir los campos de UI de las paradas antes de enviar
        const payload: CreateItinerarioPayload = {
            id_ruta: Number(idRuta),
            id_logistica_ruta: Number(idLogistica),
            turno: form.turno.trim(),
            tipo: form.tipo,
            dias: form.dias,
            hora_inicio: form.horaInicio || null,
            hora_fin: form.horaFin || null,
            minutos_tolerancia_inicio: form.tolInicio,
            minutos_tolerancia_fin: form.tolFin,
            minutos_tolerancia_anticipacion: form.tolAnticip,
            fecha_inicio: form.tipo === 2 ? (form.fechaInicio || null) : null,
            paradas: form.paradas.map((p) => ({
                id_parada: p.id_parada,
                hora_abordaje: p.hora_abordaje,
                segundos_recorrido_continuo: p.segundos_recorrido_continuo,
                segundos_recorrido_mixto: p.segundos_recorrido_mixto,
            })),
        };

        mutation.mutate(payload);
    };

    const handleReset = () => {
        setIdRuta(preselectedIdRuta ?? "");
        setIdLogistica("");
        setForm(INITIAL_STATE);
        setFieldErrors({});
        setActiveTab("general");
    };

    // ── Slot de ruta/sentido para el paso general ───────────────────────────────

    const routeSlot = (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
                <Label htmlFor="itin-ruta">Ruta *</Label>
                <select
                    id="itin-ruta"
                    value={idRuta}
                    onChange={(e) => setIdRuta(Number(e.target.value) || "")}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                    <option value="">Seleccionar ruta...</option>
                    {rutas.map((r) => (
                        <option key={r.id_ruta} value={r.id_ruta}>
                            {r.nombre} {r.clave ? `(${r.clave})` : ""}
                        </option>
                    ))}
                </select>
                {fieldErrors.id_ruta && (
                    <p className="text-xs text-red-500">{fieldErrors.id_ruta}</p>
                )}
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="itin-sentido">Sentido *</Label>
                <select
                    id="itin-sentido"
                    value={idLogistica}
                    onChange={(e) => setIdLogistica(Number(e.target.value) || "")}
                    disabled={!idRuta || logisticas.length === 0}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                >
                    <option value="">Seleccionar sentido...</option>
                    {logisticas.map((l) => (
                        <option key={l.id_logistica_ruta} value={l.id_logistica_ruta}>
                            {l.tipo_logistica === 1 ? "Ida (A→B)" : "Vuelta (B→A)"}
                            {l.direccion_inicio ? ` — ${l.direccion_inicio}` : ""}
                        </option>
                    ))}
                </select>
                {fieldErrors.id_logistica_ruta && (
                    <p className="text-xs text-red-500">{fieldErrors.id_logistica_ruta}</p>
                )}
            </div>
        </div>
    );

    // ── Tabs del modal ──────────────────────────────────────────────────────────

    const stopsEnabled = isGeneralStepComplete(form, Boolean(idRuta && idLogistica));

    const tabs: ModalTab[] = useMemo(
        () => [
            {
                id: "general",
                label: "1 · Información general",
                content: (
                    <GeneralStep
                        state={form}
                        onChange={patchForm}
                        fieldErrors={fieldErrors}
                        routeSlot={routeSlot}
                    />
                ),
            },
            {
                id: "stops",
                label: `2 · Paradas y horarios${stopsEnabled ? "" : " 🔒"}`,
                content: (
                    <StopsStep state={form} onChange={patchForm} enabled={stopsEnabled} />
                ),
            },
        ],
        // routeSlot depende de estados ya incluidos
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [form, fieldErrors, stopsEnabled, rutas, logisticas, idRuta, idLogistica],
    );

    return (
        <ModalWithTabs
            open={open}
            onOpenChange={onOpenChange}
            title="Nuevo itinerario"
            icon={CalendarClock}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(id) => {
                // Bloquear navegación al paso 2 si no está habilitado
                if (id === "stops" && !stopsEnabled) return;
                setActiveTab(id);
            }}
            onSave={handleSave}
            onReset={handleReset}
            isLoading={mutation.isPending}
            saveLabel="Crear itinerario"
            confirmCloseDescription="Se perderán los datos capturados del itinerario. ¿Deseas cerrar?"
        />
    );
};