// ─────────────────────────────────────────────────────────────────────────────
// EditUnitModal — modal de edición de unidades
// ─────────────────────────────────────────────────────────────────────────────
//
// Este turno (3): estructura del modal con tabs funcionando.
//   - Header con título, badge de estado (guardado / cambios pendientes)
//   - Tabs "Datos Generales" y "Datos Adicionales" (navegables)
//   - Footer con botones Cancelar / Guardar
//   - Confirmación al cerrar con cambios sin guardar
//   - Banner de "solo lectura" si el usuario no puede editar
//   - Skeleton mientras carga el detalle
//   - Mensaje de error si el detalle no se pudo cargar
//
// Turno 4 (próximo): los campos reales del formulario dentro de cada tab.
//
// Decisiones de diseño (heurísticas UX aplicadas):
//
//   ▸ Jakob — tabs con los mismos nombres del legacy PHP para minimizar
//     la curva de aprendizaje de usuarios migrando.
//
//   ▸ Visibilidad del estado (Nielsen #1) — badge arriba indica si hay
//     cambios sin guardar (amarillo) o si está sincronizado (verde).
//     Durante el guardado, el botón muestra "Guardando..." con spinner.
//
//   ▸ Control y libertad del usuario (Nielsen #3) — si el usuario cierra
//     el modal con cambios, pedimos confirmación. Si no hay cambios,
//     cerramos directo (fricción solo cuando vale la pena).
//
//   ▸ Hick — para usuarios sin permiso cund_edit, el botón "Guardar" se
//     OCULTA (no se deshabilita). Menos ruido visual, menos dudas sobre
//     por qué un botón está gris.
//
//   ▸ Recuperación de errores (Nielsen #9) — banner de error con mensaje
//     específico (no un "ocurrió un error" genérico). El backend manda
//     códigos semánticos (UNIT_NOT_FOUND, FIELDS_NOT_ALLOWED) y los
//     mapeamos a textos accionables.

import { useState } from "react";
import { BusFront, Pencil, Lock, AlertCircle, RotateCcw } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

import { useUnitEdit } from "../hooks/useUnitEdit";

// ── Props ────────────────────────────────────────────────────────────────────
interface EditUnitModalProps {
    // id de la unidad a editar. Cuando es null el modal está cerrado
    // (controlamos apertura con el mismo prop para simplificar el caller).
    idUnidad: number | null;
    // Callback cuando se cierra el modal (el parent limpia el idUnidad).
    onClose: () => void;
}

type TabKey = "general" | "additional";

export const EditUnitModal = ({ idUnidad, onClose }: EditUnitModalProps) => {
    const [activeTab, setActiveTab] = useState<TabKey>("general");
    const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

    const {
        detail,
        isLoading,
        loadError,
        isDirty,
        isSaving,
        saveError,
        save,
        resetForm,
        canEdit,
        canViewTechnical,
    } = useUnitEdit({ idUnidad });

    const isOpen = idUnidad !== null;

    // ── Handlers ───────────────────────────────────────────────────────────
    // Si hay cambios sin guardar, pedir confirmación antes de cerrar.
    // Si no hay cambios, cerrar directo — evitar fricción innecesaria.
    const handleRequestClose = () => {
        if (isDirty) {
            setIsCloseConfirmOpen(true);
        } else {
            onClose();
        }
    };

    const handleConfirmClose = () => {
        setIsCloseConfirmOpen(false);
        onClose();
    };

    const handleSave = async () => {
        const ok = await save();
        // Tras un guardado exitoso cerramos el modal. El usuario no tiene
        // que hacer click extra — Fitts + economía de clicks.
        if (ok) onClose();
    };

    // Cuando se usa onOpenChange del Dialog, re-dirigir a nuestro flujo
    // para que la confirmación de cambios también se dispare con Escape
    // o click en el overlay.
    const handleOpenChange = (open: boolean) => {
        if (!open) handleRequestClose();
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-3xl gap-0 p-0">
                    {/* ── Header ────────────────────────────────────────────────── */}
                    <DialogHeader className="border-b border-slate-200 px-6 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                    <BusFront className="h-5 w-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-semibold text-slate-800">
                                        Editar unidad
                                    </DialogTitle>
                                    <DialogDescription className="text-sm text-slate-500">
                                        {detail
                                            ? `${detail.numero} · ${detail.marca}${detail.modelo ? ` ${detail.modelo}` : ""}`
                                            : "Cargando datos..."}
                                    </DialogDescription>
                                </div>
                            </div>

                            {/* Badge de estado — visible solo si puede editar */}
                            {canEdit && detail && (
                                <SaveStateBadge isDirty={isDirty} isSaving={isSaving} />
                            )}
                        </div>

                        {/* Tabs: dos para sudo_erp, igual para admin (consistencia) */}
                        <div className="mt-4 flex gap-4 border-b border-slate-200">
                            <TabButton
                                active={activeTab === "general"}
                                onClick={() => setActiveTab("general")}
                            >
                                Datos Generales
                            </TabButton>
                            <TabButton
                                active={activeTab === "additional"}
                                onClick={() => setActiveTab("additional")}
                            >
                                Datos Adicionales
                            </TabButton>
                        </div>
                    </DialogHeader>

                    {/* ── Body ──────────────────────────────────────────────────── */}
                    <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
                        {/* Banner readonly: cuando el usuario no puede editar */}
                        {!canEdit && !isLoading && (
                            <ReadonlyBanner />
                        )}

                        {/* Banner de error del servidor al cargar */}
                        {loadError && (
                            <ErrorBanner
                                title="No se pudo cargar la unidad"
                                message={loadError.message}
                            />
                        )}

                        {/* Banner de error al guardar (persistente hasta siguiente intento) */}
                        {saveError && (
                            <ErrorBanner
                                title="Error al guardar"
                                message={saveError}
                            />
                        )}

                        {/* Skeleton mientras carga */}
                        {isLoading && <FormSkeleton />}

                        {/* Placeholders temporales — los campos llegan en el turno 4 */}
                        {!isLoading && detail && (
                            <div className="space-y-6">
                                {activeTab === "general" && (
                                    <PlaceholderTab
                                        title="Datos Generales"
                                        hint={
                                            canViewTechnical
                                                ? "Incluye identidad de la unidad, asignación de operador y grupo, y equipo instalado (IMEI, chip, inputs/outputs)."
                                                : "Incluye identidad de la unidad y asignación de operador y grupo."
                                        }
                                    />
                                )}
                                {activeTab === "additional" && (
                                    <PlaceholderTab
                                        title="Datos Adicionales"
                                        hint="Combustible, seguro y verificación vehicular."
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Footer ────────────────────────────────────────────────── */}
                    <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                        {/* Revertir cambios — visible solo si puede editar y hay cambios */}
                        <div>
                            {canEdit && isDirty && !isSaving && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
                                    title="Descartar cambios"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Revertir
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleRequestClose}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                                {canEdit ? "Cancelar" : "Cerrar"}
                            </button>

                            {/* Botón Guardar se OCULTA (no se deshabilita) cuando el
                  usuario no puede editar — Hick: menos opciones irrelevantes. */}
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={!isDirty || isSaving}
                                    className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors enabled:hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Pencil className="h-4 w-4" />
                                            Guardar
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirmación al cerrar con cambios sin guardar */}
            <ConfirmDialog
                open={isCloseConfirmOpen}
                onOpenChange={setIsCloseConfirmOpen}
                title="¿Descartar cambios?"
                description="Hay cambios sin guardar. Si cierras ahora se perderán."
                confirmText="DESCARTAR Y CERRAR"
                cancelText="SEGUIR EDITANDO"
                confirmButtonClassName="bg-red-500 hover:bg-red-600 text-white"
                onConfirm={handleConfirmClose}
            />
        </>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponentes — en el mismo archivo porque son chicos y solo se usan aquí
// ─────────────────────────────────────────────────────────────────────────────

const TabButton = ({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${active
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
    >
        {children}
    </button>
);

// Badge que comunica el estado del form al usuario (Nielsen #1).
const SaveStateBadge = ({
    isDirty,
    isSaving,
}: {
    isDirty: boolean;
    isSaving: boolean;
}) => {
    if (isSaving) {
        return (
            <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                Guardando
            </span>
        );
    }
    if (isDirty) {
        return (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Cambios sin guardar
            </span>
        );
    }
    return (
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Sincronizado
        </span>
    );
};

// Banner superior del body cuando el modal está en modo solo lectura.
const ReadonlyBanner = () => (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <div>
            <p className="text-sm font-medium text-slate-700">
                Modo solo lectura
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
                Puedes consultar los datos pero no modificarlos. Si necesitas
                editar esta unidad, solicita el permiso al administrador de tu
                empresa.
            </p>
        </div>
    </div>
);

// Banner de error genérico con título y descripción.
const ErrorBanner = ({
    title,
    message,
}: {
    title: string;
    message: string;
}) => (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
        <div>
            <p className="text-sm font-medium text-red-800">{title}</p>
            <p className="mt-0.5 text-xs text-red-700">{message}</p>
        </div>
    </div>
);

// Skeleton del formulario — mismos bloques que el form real para que
// la transición skeleton → contenido real no haga "saltar" el layout.
const FormSkeleton = () => (
    <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div className="h-10 animate-pulse rounded bg-slate-100" />
            <div className="h-10 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="h-10 animate-pulse rounded bg-slate-100" />
            <div className="h-10 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-20 animate-pulse rounded bg-slate-100" />
    </div>
);

// Placeholder temporal — reemplazar en el turno 4 con los campos reales.
const PlaceholderTab = ({
    title,
    hint,
}: {
    title: string;
    hint: string;
}) => (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
        <p className="mt-3 text-xs italic text-slate-400">
            Los campos del formulario se implementan en el siguiente turno.
        </p>
    </div>
);