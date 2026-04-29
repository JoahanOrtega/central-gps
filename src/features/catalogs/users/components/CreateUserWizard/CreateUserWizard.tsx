import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, UserPlus } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/stores/notificationStore";
import { queryKeys } from "@/lib/query-keys";
import { userService } from "../../services/userService";
import {
    INITIAL_WIZARD_FORM,
    buildCreatePayload,
    buildUpdatePayload,
    detailToFormState,
} from "../../services/catalogUserHelpers";
import { StepIndicator } from "./StepIndicator";
import { Step1Datos } from "./Step1Datos";
import { Step2Restricciones } from "./Step2Restricciones";
import { Step3Permisos } from "./Step3Permisos";
import type {
    WizardFormState,
    UserFieldErrors,
    RolCreable,
    UserListItem,
} from "../../types/user.types";

// ─── Configuración de pasos ──────────────────────────────────────────────────
const STEPS = [
    { id: 1, label: "Datos" },
    { id: 2, label: "Restricciones" },
    { id: 3, label: "Permisos" },
] as const;

const TOTAL_STEPS = STEPS.length;

interface CreateUserWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // ID de la empresa donde se crea/edita el usuario.
    idEmpresa: number;
    // ── Modo edición ────────────────────────────────────────────────────
    // Si viene un user, el wizard se abre en modo edición:
    //   - Carga el detalle del usuario via getDetail
    //   - Pre-llena el form con detailToFormState
    //   - Oculta los campos de password y desactiva el campo "usuario"
    //   - Cambia el título y el botón final a "Guardar cambios"
    //   - Al submit usa update en lugar de create con DIFF mínimo
    editingUser?: UserListItem | null;
    // Callback opcional al crear/editar exitosamente.
    onSuccess?: (idUsuario: number) => void;
}

export const CreateUserWizard = ({
    open,
    onOpenChange,
    idEmpresa,
    editingUser = null,
    onSuccess,
}: CreateUserWizardProps) => {
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((s) => s.user);

    const isEditMode = editingUser !== null;

    const [currentStep, setCurrentStep] = useState(1);
    const [form, setForm] = useState<WizardFormState>(INITIAL_WIZARD_FORM);
    const [serverErrors, setServerErrors] = useState<UserFieldErrors>({});
    const [globalError, setGlobalError] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Cargar detalle del usuario en modo edición ─────────────────────────
    // Solo se ejecuta si el wizard está abierto Y hay un editingUser.
    // useQuery automáticamente se invalida si cambia el id.
    const { data: detailData } = useQuery({
        queryKey: editingUser
            ? queryKeys.catalogs.users.detail(editingUser.id)
            : ["wizard-no-detail"],
        queryFn: ({ signal }) =>
            editingUser
                ? userService.getDetail(editingUser.id, idEmpresa, signal)
                : Promise.resolve(null),
        enabled: open && isEditMode,
        staleTime: 30 * 1000,
    });


    // ── Roles permitidos según quién está creando ──────────────────────────
    // Solo el sudo_erp puede asignar el rol admin_empresa.
    // admin_empresa y usuario solo pueden trabajar con rol "usuario".
    // El backend NO valida esto explícitamente — su única regla es el
    // permiso 'usuarios.editar'. Pero ocultar la opción al admin_empresa
    // previene escalación de privilegios desde la UI y reduce errores.
    const allowedRoles = useMemo<RolCreable[]>(() => {
        if (currentUser?.rol === "sudo_erp") {
            return ["admin_empresa", "usuario"];
        }
        return ["usuario"];
    }, [currentUser?.rol]);

    // ── Pre-llenar el form cuando llega el detail ─────────────────────────
    // Solo se ejecuta cuando detail llega del backend en modo edición.
    // El reset al cerrar lo maneja el effect siguiente.
    useEffect(() => {
        if (isEditMode && detailData) {
            setForm(detailToFormState(detailData));
        }
    }, [isEditMode, detailData]);

    // ── Sincronizar el rol con allowedRoles ────────────────────────────────
    // Si el wizard se abre con un rol no permitido para el creador (raro
    // pero posible por bug en otra parte), forzamos el primer rol válido.
    useEffect(() => {
        if (open && !allowedRoles.includes(form.rol)) {
            setForm((prev) => ({ ...prev, rol: allowedRoles[0] }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, allowedRoles]);

    // ── Reset al cerrar ────────────────────────────────────────────────────
    // Limpia todo el estado interno cuando el modal se cierra. Sin esto,
    // datos sensibles (clave) podrían quedar en memoria de React entre
    // aperturas. Garantiza que al reabrir sea desde el paso 1.
    useEffect(() => {
        if (!open) {
            setCurrentStep(1);
            setForm(INITIAL_WIZARD_FORM);
            setServerErrors({});
            setGlobalError("");
            setIsSubmitting(false);
        }
    }, [open]);

    // ── Helper para actualizar el form parcialmente ────────────────────────
    // Patch en lugar de set completo. También limpia errores específicos de
    // los campos editados (defensa contra mostrar errores viejos sobre
    // campos ya corregidos).
    const handleFormChange = (patch: Partial<WizardFormState>) => {
        setForm((prev) => ({ ...prev, ...patch }));

        const datosKeys: (keyof WizardFormState)[] = [
            "usuario",
            "clave",
            "confirm_clave",
            "nombre",
            "rol",
            "email",
            "telefono",
        ];
        const restriccionesKeys: (keyof WizardFormState)[] = [
            "dias_acceso",
            "hora_inicio",
            "hora_fin",
            "id_grupo_unidades",
            "id_cliente",
            "dias_consulta",
        ];
        const permisosKeys: (keyof WizardFormState)[] = [
            "tipoAcceso",
            "permisosSeleccionados",
        ];

        const editedKeys = Object.keys(patch) as (keyof WizardFormState)[];

        if (editedKeys.some((k) => datosKeys.includes(k)) && serverErrors.datos) {
            setServerErrors((prev) => ({ ...prev, datos: undefined }));
        }
        if (
            editedKeys.some((k) => restriccionesKeys.includes(k)) &&
            serverErrors.restricciones
        ) {
            setServerErrors((prev) => ({ ...prev, restricciones: undefined }));
        }
        if (editedKeys.some((k) => permisosKeys.includes(k)) && serverErrors.permisos) {
            setServerErrors((prev) => ({ ...prev, permisos: undefined }));
        }
        if (globalError) setGlobalError("");
    };

    // ── Validación por step antes de avanzar ───────────────────────────────
    const isStepValid = (step: number): boolean => {
        if (step === 1) {
            // En modo edición no validamos password (no se pide).
            const passwordValid = isEditMode
                ? true
                : form.clave.length >= 8 && form.confirm_clave === form.clave;
            return (
                form.usuario.trim().length >= 3 &&
                passwordValid &&
                form.nombre.trim().length >= 2 &&
                allowedRoles.includes(form.rol)
            );
        }
        if (step === 2) {
            // Step 2 es opcional. Las únicas reglas son las inline.
            if (
                form.hora_inicio &&
                form.hora_fin &&
                form.hora_inicio >= form.hora_fin
            ) {
                return false;
            }
            return true;
        }
        if (step === 3) {
            // Step 3 también es opcional — siempre válido.
            return true;
        }
        return false;
    };

    const goNext = () => {
        if (currentStep < TOTAL_STEPS && isStepValid(currentStep)) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const goPrev = () => {
        if (currentStep > 1 && !isSubmitting) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    // ── Submit final ──────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!isStepValid(1) || !isStepValid(2) || !isStepValid(3)) return;

        setIsSubmitting(true);
        setServerErrors({});
        setGlobalError("");

        try {
            // ── Modo edición: PATCH con DIFF ───────────────────────────
            if (isEditMode && detailData && editingUser) {
                const payload = buildUpdatePayload(form, detailData);

                // Si no hay cambios, evitar la request — UX más rápida y
                // honesta. El usuario ve el feedback de inmediato.
                if (Object.keys(payload).length === 0) {
                    notify.info("No hay cambios para guardar");
                    setIsSubmitting(false);
                    return;
                }

                const result = await userService.update(editingUser.id, idEmpresa, payload);

                if (result.kind === "success") {
                    notify.success(
                        `Cambios guardados en ${form.nombre.trim() || editingUser.nombre}`,
                    );
                    await queryClient.invalidateQueries({
                        queryKey: queryKeys.catalogs.users.all,
                    });
                    onSuccess?.(editingUser.id);
                    onOpenChange(false);
                    return;
                }

                if (result.kind === "validation") {
                    setServerErrors(result.fields);
                    if (result.fields.datos) setCurrentStep(1);
                    else if (result.fields.restricciones) setCurrentStep(2);
                    else if (result.fields.permisos) setCurrentStep(3);
                    return;
                }

                setGlobalError(result.message);
                return;
            }

            // ── Modo creación: POST con todos los campos ──────────────
            const payload = buildCreatePayload(form);
            const result = await userService.create(idEmpresa, payload);

            if (result.kind === "success") {
                notify.success(
                    `Usuario ${result.data.usuario.usuario} creado correctamente`,
                );
                await queryClient.invalidateQueries({
                    queryKey: queryKeys.catalogs.users.all,
                });
                onSuccess?.(result.data.usuario.id_usuario);
                onOpenChange(false);
                return;
            }

            if (result.kind === "validation") {
                setServerErrors(result.fields);
                // Saltar al primer step que tiene errores para que el usuario
                // pueda corregirlos sin tener que adivinar dónde están.
                if (result.fields.datos) setCurrentStep(1);
                else if (result.fields.restricciones) setCurrentStep(2);
                else if (result.fields.permisos) setCurrentStep(3);
                return;
            }

            setGlobalError(result.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Cerrar el modal con confirmación si hay datos sin guardar ─────────
    const handleClose = () => {
        if (isSubmitting) return; // No cerrar mientras procesa

        // En modo edición, comparar contra el detail original para saber
        // si hay cambios. En creación, basta con que haya algo escrito.
        const hasUnsavedData = (() => {
            if (isEditMode && detailData) {
                const diff = buildUpdatePayload(form, detailData);
                return Object.keys(diff).length > 0;
            }
            return Boolean(form.usuario.trim() || form.nombre.trim() || form.clave);
        })();

        if (hasUnsavedData) {
            const ok = window.confirm(
                "¿Cerrar sin guardar? Los cambios se perderán.",
            );
            if (!ok) return;
        }

        onOpenChange(false);
    };

    const renderCurrentStep = () => {
        if (currentStep === 1) {
            return (
                <Step1Datos
                    form={form}
                    onChange={handleFormChange}
                    serverErrors={serverErrors.datos}
                    allowedRoles={allowedRoles}
                    isEditMode={isEditMode}
                />
            );
        }
        if (currentStep === 2) {
            return (
                <Step2Restricciones
                    form={form}
                    onChange={handleFormChange}
                    serverErrors={serverErrors.restricciones}
                    idEmpresa={idEmpresa}
                />
            );
        }
        if (currentStep === 3) {
            return <Step3Permisos form={form} onChange={handleFormChange} />;
        }
        return null;
    };

    const isLastStep = currentStep === TOTAL_STEPS;

    // Título y botón final cambian según el modo
    const dialogTitle = isEditMode ? "Editar usuario" : "Nuevo usuario";
    const submitLabel = isEditMode
        ? isSubmitting
            ? "Guardando..."
            : "Guardar cambios"
        : isSubmitting
            ? "Creando..."
            : "Crear usuario";

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-blue-500" aria-hidden="true" />
                        {dialogTitle}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? "Modifica los datos, restricciones o permisos. Solo se guardarán los cambios realizados."
                            : "Completa los datos del nuevo usuario. Puedes saltar las restricciones si no las necesitas."}
                    </DialogDescription>
                </DialogHeader>

                {/* ── Stepper ───────────────────────────────────────────── */}
                <div className="my-4 px-2">
                    <StepIndicator steps={[...STEPS]} currentStep={currentStep} />
                </div>

                {/* ── Error global del backend ────────────────────────── */}
                {globalError && (
                    <div
                        role="alert"
                        aria-live="assertive"
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                    >
                        {globalError}
                    </div>
                )}

                {/* ── Contenido del step actual ─────────────────────────
                    max-h con overflow-auto evita que steps largos rompan
                    el viewport. Header y footer del modal quedan fijos. */}
                <div className="max-h-[60vh] overflow-y-auto px-1 py-2">
                    {renderCurrentStep()}
                </div>

                {/* ── Footer con navegación ─────────────────────────── */}
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <button
                        type="button"
                        onClick={goPrev}
                        disabled={currentStep === 1 || isSubmitting}
                        className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                    </button>

                    <span className="text-xs text-slate-500">
                        Paso {currentStep} de {TOTAL_STEPS}
                    </span>

                    {isLastStep ? (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={
                                isSubmitting ||
                                !isStepValid(1) ||
                                !isStepValid(2) ||
                                !isStepValid(3)
                            }
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {submitLabel}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={goNext}
                            disabled={!isStepValid(currentStep)}
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Siguiente
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};