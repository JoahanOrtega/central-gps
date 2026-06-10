// ─────────────────────────────────────────────────────────────────────────────
// EditItineraryModal — editar itinerario con flujo de 2 pasos
//
// Mismo patrón de ModalWithTabs que NewItineraryModal. La ruta y el
// sentido NO son editables (cambiarlos sería otro itinerario) — se
// muestran como contexto fijo en el encabezado del paso general.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from "react";
import { CalendarClock, Route as RouteIcon } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useNotificationStore } from "@/stores/notificationStore";
import { queryKeys } from "@/lib/query-keys";
import { ApiError } from "@/lib/api";
import { ModalWithTabs, type ModalTab } from "@/components/shared";

import { itineraryService } from "./itineraryService";
import type { CreateItinerarioPayload } from "./itinerary.types";
import {
    GeneralStep,
    StopsStep,
    isGeneralStepComplete,
    type ItineraryFormState,
} from "./ItineraryFormTabs";

interface EditItineraryModalProps {
    idItinerario: number | null;
    onClose: () => void;
    onSuccess: () => void;
}

const EMPTY_STATE: ItineraryFormState = {
    turno: "",
    tipo: 1,
    dias: [],
    horaInicio: "",
    horaFin: "",
    tolInicio: 30,
    tolFin: 0,
    tolAnticip: 10,
    fechaInicio: "",
    paradas: [],
};

export const EditItineraryModal = ({
    idItinerario,
    onClose,
    onSuccess,
}: EditItineraryModalProps) => {
    const { idEmpresa } = useEmpresaActiva();
    const notify = useNotificationStore((s) => s.addNotification);

    const [activeTab, setActiveTab] = useState("general");
    const [form, setForm] = useState<ItineraryFormState>(EMPTY_STATE);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const patchForm = (patch: Partial<ItineraryFormState>) =>
        setForm((prev) => ({ ...prev, ...patch }));

    // ── Cargar el itinerario ────────────────────────────────────────────────────

    const { data, isLoading } = useQuery({
        queryKey: queryKeys.operation.itineraryDetail(idItinerario!, idEmpresa),
        queryFn: () => itineraryService.getById(idItinerario!, idEmpresa),
        enabled: !!idItinerario && !!idEmpresa,
    });

    // Poblar formulario cuando llegan los datos.
    // El GET del backend ya incluye nombre/numero por parada —
    // se mapean directo a los campos de UI.
    useEffect(() => {
        if (!data) return;
        setForm({
            turno: data.turno ?? "",
            tipo: data.tipo ?? 1,
            dias: (data.dias ?? []) as ItineraryFormState["dias"],
            horaInicio: data.hora_inicio ?? "",
            horaFin: data.hora_fin ?? "",
            tolInicio: data.minutos_tolerancia_inicio ?? 30,
            tolFin: data.minutos_tolerancia_fin ?? 0,
            tolAnticip: data.minutos_tolerancia_anticipacion ?? 10,
            fechaInicio: data.fecha_inicio ?? "",
            paradas: data.paradas ?? [],
        });
    }, [data]);

    // Reset al cerrar
    useEffect(() => {
        if (!idItinerario) {
            setActiveTab("general");
            setForm(EMPTY_STATE);
            setFieldErrors({});
        }
    }, [idItinerario]);

    // ── Guardado ────────────────────────────────────────────────────────────────

    const mutation = useMutation({
        mutationFn: (payload: CreateItinerarioPayload) =>
            itineraryService.update(idItinerario!, payload, idEmpresa),
        onSuccess: () => {
            notify({
                type: "success",
                message: `Turno "${form.turno}" actualizado correctamente`,
            });
            onSuccess();
        },
        onError: (err) => {
            if (err instanceof ApiError && err.fieldErrors) {
                setFieldErrors(err.fieldErrors);
                setActiveTab("general");
            } else {
                notify({
                    type: "error",
                    message: err instanceof Error ? err.message : "Error al actualizar",
                });
            }
        },
    });

    const handleSave = () => {
        if (!data) return;
        setFieldErrors({});

        if (!form.turno.trim()) {
            setFieldErrors({ turno: "El código de turno es requerido" });
            setActiveTab("general");
            return;
        }

        mutation.mutate({
            id_ruta: data.id_ruta,
            id_logistica_ruta: data.id_logistica_ruta,
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
        });
    };

    const handleReset = () => {
        if (!data) return;
        setForm({
            turno: data.turno ?? "",
            tipo: data.tipo ?? 1,
            dias: (data.dias ?? []) as ItineraryFormState["dias"],
            horaInicio: data.hora_inicio ?? "",
            horaFin: data.hora_fin ?? "",
            tolInicio: data.minutos_tolerancia_inicio ?? 30,
            tolFin: data.minutos_tolerancia_fin ?? 0,
            tolAnticip: data.minutos_tolerancia_anticipacion ?? 10,
            fechaInicio: data.fecha_inicio ?? "",
            paradas: data.paradas ?? [],
        });
        setFieldErrors({});
    };

    // ── Contexto fijo de ruta (no editable) ─────────────────────────────────────

    const routeSlot = data ? (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <RouteIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <div className="min-w-0 text-sm">
                <span className="font-medium text-slate-700">
                    {data.nombre_ruta ?? `Ruta ${data.id_ruta}`}
                </span>
                {data.clave_ruta && (
                    <span className="ml-2 text-slate-400">{data.clave_ruta}</span>
                )}
                <span className="ml-2 text-slate-400">
                    · {data.tipo_logistica === 2 ? "Vuelta (B→A)" : "Ida (A→B)"}
                </span>
            </div>
        </div>
    ) : null;

    // ── Tabs del modal ──────────────────────────────────────────────────────────

    const stopsEnabled = isGeneralStepComplete(form, true);

    const tabs: ModalTab[] = useMemo(
        () => [
            {
                id: "general",
                label: "1 · Información general",
                content: isLoading ? (
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" />
                    </div>
                ) : (
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [form, fieldErrors, stopsEnabled, isLoading, data],
    );

    return (
        <ModalWithTabs
            open={!!idItinerario}
            onOpenChange={(o) => !o && onClose()}
            title={`Editar itinerario${data ? ` — Turno ${data.turno}` : ""}`}
            icon={CalendarClock}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(id) => {
                if (id === "stops" && !stopsEnabled) return;
                setActiveTab(id);
            }}
            onSave={handleSave}
            onReset={handleReset}
            isLoading={mutation.isPending}
            saveLabel="Guardar cambios"
            confirmCloseDescription="Se perderán los cambios sin guardar. ¿Deseas cerrar?"
        />
    );
};