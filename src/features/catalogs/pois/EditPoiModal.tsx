// Modal para editar los datos básicos de un POI.
//
// Alcance intencional — solo campos textuales:
//   - nombre (obligatorio)
//   - direccion
//   - observaciones
//
// NO incluye geometría (lat/lng/radio/polígono).
//
// Razones del scope reducido:
//   1. UX: editar geometría con mapa interactivo es complejo y propenso
//      a accidentes (el usuario arrastra sin querer, mueve un POI clave).
//   2. Seguridad operativa: si un usuario quiere mover un POI, eliminar
//      y recrear es más explícito que un drag accidental.
//   3. Consistencia con NewPoiModal: ese sí tiene mapa porque crear es
//      la operación natural para definir geometría — editar geometría
//      es el caso raro.
//   4. Heurística #5 de Nielsen: prevenir errores. Mover puntos críticos
//      (bodegas, puntos de control) accidentalmente con un click podría
//      romper procesos operativos del cliente.
//
// Si en el futuro se necesita editar geometría, se puede agregar como
// segunda pestaña dentro de este mismo modal (siguiendo el patrón de
// EditUnitModal con tabs General/Adicional).

import { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { MapPin, Loader2 } from "lucide-react";
import { poiService } from "./poiService";
import type { PoiItem, UpdatePoiPayload } from "./poi.types";
import { notify } from "@/stores/notificationStore";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

// ── Constantes de validación ─────────────────────────────────────────────────
// Espejo del backend (CreatePoiSchema/UpdatePoiSchema): nombre min 1 max 100.
const NOMBRE_MAX_LENGTH = 100;
const DIRECCION_MAX_LENGTH = 200;
const OBSERVACIONES_MAX_LENGTH = 500;

interface EditPoiModalProps {
    // null = cerrado | PoiItem = abierto editando ese POI
    poi: PoiItem | null;
    onClose: () => void;
}

// ── Estado del formulario ────────────────────────────────────────────────────
// Solo los 3 campos editables. Mantener la forma simple evita que en
// el futuro alguien agregue un input nuevo y olvide que el payload
// PATCH solo manda lo modificado.
interface EditForm {
    nombre: string;
    direccion: string;
    observaciones: string;
}

const formFromPoi = (poi: PoiItem): EditForm => ({
    nombre: poi.nombre ?? "",
    direccion: poi.direccion ?? "",
    observaciones: poi.observaciones ?? "",
});

export const EditPoiModal = ({ poi, onClose }: EditPoiModalProps) => {
    const queryClient = useQueryClient();
    const { idEmpresa } = useEmpresaActiva();

    // Estado local del form. Se sincroniza con el POI cada vez que se
    // abre el modal (poi cambia de null a un objeto). Se usa el id
    // como dependencia del effect — si el usuario edita poi1 → cancela →
    // abre poi2, queremos cargar los datos de poi2, no quedarnos con poi1.
    const [form, setForm] = useState<EditForm>({
        nombre: "",
        direccion: "",
        observaciones: "",
    });
    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState("");

    // Ref para auto-focus al campo nombre al abrir.
    const nombreRef = useRef<HTMLInputElement>(null);

    // ── Sincronizar form cuando cambia el POI a editar ──────────────────────
    useEffect(() => {
        if (poi) {
            setForm(formFromPoi(poi));
            setSubmitError("");
            // Auto-focus tras la animación del Dialog. setTimeout(0) deja
            // que el dialog termine de renderizarse antes de mover focus.
            const t = setTimeout(() => nombreRef.current?.focus(), 0);
            return () => clearTimeout(t);
        }
    }, [poi]);

    // ── Validación local ────────────────────────────────────────────────────
    // Errores que se calculan en cada render — sin estado intermedio.
    // Solo se muestran cuando el usuario ya empezó a escribir y borró
    // el contenido (length 0 después de haber tenido valor previo).
    const nombreError = (() => {
        if (form.nombre.trim().length === 0) {
            return "El nombre no puede estar vacío";
        }
        if (form.nombre.length > NOMBRE_MAX_LENGTH) {
            return `Máximo ${NOMBRE_MAX_LENGTH} caracteres`;
        }
        return null;
    })();

    // ── Detectar cambios reales ─────────────────────────────────────────────
    // Si el usuario abre el modal y no cambia nada, no tiene sentido enviar
    // un PATCH vacío al backend (responde 400 "No hay campos para actualizar").
    // canSubmit refleja "hay algo distinto al original Y es válido".
    const hasChanges = poi
        ? form.nombre !== (poi.nombre ?? "") ||
        form.direccion !== (poi.direccion ?? "") ||
        form.observaciones !== (poi.observaciones ?? "")
        : false;

    const canSubmit = !saving && !nombreError && hasChanges;

    // ── Handlers ────────────────────────────────────────────────────────────
    const handleField = (field: keyof EditForm) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setForm((prev) => ({ ...prev, [field]: e.target.value }));
            // Cualquier edición limpia el error del submit anterior.
            if (submitError) setSubmitError("");
        };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!canSubmit || !poi) return;

        setSaving(true);
        setSubmitError("");

        try {
            // Construir payload SOLO con campos modificados — el backend
            // PATCH no inyecta defaults, los campos omitidos no se tocan.
            // Comparamos con valores normalizados ("" en lugar de null)
            // porque eso es lo que viene del form.
            const payload: UpdatePoiPayload = {};

            const nombreNormalizado = form.nombre.trim();
            if (nombreNormalizado !== (poi.nombre ?? "")) {
                payload.nombre = nombreNormalizado;
            }

            const direccionNormalizada = form.direccion.trim();
            if (direccionNormalizada !== (poi.direccion ?? "")) {
                // Si quedó vacío, mandamos null para que en BD quede NULL,
                // no string vacío. El backend acepta allow_none=True.
                payload.direccion = direccionNormalizada || null;
            }

            const observacionesNormalizadas = form.observaciones.trim();
            if (observacionesNormalizadas !== (poi.observaciones ?? "")) {
                payload.observaciones = observacionesNormalizadas || null;
            }

            await poiService.updatePoi(poi.id_poi, payload, idEmpresa);

            // Invalidar caché para que el listado refresque automáticamente.
            // No usamos refetchQueries — invalidate es más eficiente: marca
            // los datos como stale y solo refetcha si la query está activa
            // (lo está si el modal se abrió desde PointsOfInterestView).
            await queryClient.invalidateQueries({
                queryKey: queryKeys.pois.all,
            });

            notify.success("POI actualizado correctamente");
            onClose();
        } catch (err) {
            // El error 422 con campo "nombre" se mostraría como banner
            // global aquí porque el modal solo edita un campo crítico.
            // Si en el futuro se editan más campos, conviene capturar
            // `fields` como en ChangePasswordModal.
            setSubmitError(
                err instanceof Error
                    ? err.message
                    : "No fue posible actualizar el POI",
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={poi !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-slate-500" aria-hidden="true" />
                        Editar punto de interés
                    </DialogTitle>
                    <DialogDescription>
                        Actualiza los datos básicos. Si necesitas cambiar la ubicación
                        en el mapa, elimina este punto y crea uno nuevo.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Error global del submit */}
                    {submitError && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                        >
                            {submitError}
                        </div>
                    )}

                    {/* ── Nombre ── */}
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="poi-nombre"
                            className="text-sm font-medium text-slate-700"
                        >
                            Nombre <span className="text-rose-500">*</span>
                        </label>
                        <input
                            id="poi-nombre"
                            ref={nombreRef}
                            type="text"
                            value={form.nombre}
                            onChange={handleField("nombre")}
                            disabled={saving}
                            maxLength={NOMBRE_MAX_LENGTH}
                            aria-invalid={Boolean(nombreError && form.nombre.length > 0)}
                            aria-describedby={
                                nombreError && form.nombre.length === 0
                                    ? "poi-nombre-error"
                                    : undefined
                            }
                            className={`h-10 rounded-lg border px-3 text-sm outline-none transition-colors ${nombreError && form.nombre.trim().length === 0
                                ? "border-rose-300 focus:border-rose-400"
                                : "border-slate-300 focus:border-blue-400"
                                }`}
                        />
                        {/* Solo mostramos error si es trim().length === 0 — el otro
                            error (max length) lo previene maxLength del input. */}
                        {nombreError && form.nombre.trim().length === 0 && (
                            <p
                                id="poi-nombre-error"
                                role="alert"
                                className="text-xs text-rose-600"
                            >
                                {nombreError}
                            </p>
                        )}
                    </div>

                    {/* ── Dirección ── */}
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="poi-direccion"
                            className="text-sm font-medium text-slate-700"
                        >
                            Dirección
                            <span className="ml-1 text-xs font-normal text-slate-400">
                                (opcional)
                            </span>
                        </label>
                        <input
                            id="poi-direccion"
                            type="text"
                            value={form.direccion}
                            onChange={handleField("direccion")}
                            disabled={saving}
                            maxLength={DIRECCION_MAX_LENGTH}
                            placeholder="Calle, colonia, ciudad..."
                            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-400"
                        />
                    </div>

                    {/* ── Observaciones ── */}
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="poi-observaciones"
                            className="text-sm font-medium text-slate-700"
                        >
                            Observaciones
                            <span className="ml-1 text-xs font-normal text-slate-400">
                                (opcional)
                            </span>
                        </label>
                        <textarea
                            id="poi-observaciones"
                            value={form.observaciones}
                            onChange={handleField("observaciones")}
                            disabled={saving}
                            maxLength={OBSERVACIONES_MAX_LENGTH}
                            rows={3}
                            placeholder="Notas adicionales sobre este punto..."
                            className="resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
                        />
                        {/* Contador como hint visual del límite */}
                        <p className="self-end text-xs text-slate-400">
                            {form.observaciones.length} / {OBSERVACIONES_MAX_LENGTH}
                        </p>
                    </div>

                    {/* ── Footer ── */}
                    <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {saving ? "Guardando..." : "Guardar cambios"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};