import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { authService } from "../services/authService";
import type {
    ChangePasswordFieldErrors,
    ChangePasswordPayload,
} from "../types/auth.types";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/stores/notificationStore";
import { cn } from "@/lib/utils";

// ─── Constantes de validación ─────────────────────────────────────────────────
// Espejo exacto de la regla del backend (MIN_PASSWORD_LENGTH=8 en
// password_validators.py). Si el backend cambia esta regla, este número
// debe cambiar también — no hay un mecanismo automático para sincronizar
// schemas marshmallow ⇄ TypeScript en este proyecto. Si en el futuro se
// agrega tipos compartidos generados, este const desaparece.
const MIN_PASSWORD_LENGTH = 8;

// ─── Estado inicial del formulario ────────────────────────────────────────────
const INITIAL_FORM: ChangePasswordPayload = {
    current_password: "",
    new_password: "",
    confirm_password: "",
};

// ─── Tipo para el toggle de visibilidad por campo ─────────────────────────────
// Cada campo tiene su propio toggle independiente — el usuario puede
// querer ver la nueva sin ver la actual, por ejemplo.
type FieldVisibility = {
    current_password: boolean;
    new_password: boolean;
    confirm_password: boolean;
};

const INITIAL_VISIBILITY: FieldVisibility = {
    current_password: false,
    new_password: false,
    confirm_password: false,
};

interface ChangePasswordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Modal de cambio de contraseña.
 *
 * Heurísticas UX aplicadas (Nielsen):
 *
 *   #1 Visibilidad del estado del sistema
 *      - Spinner inline en el botón "Cambiar" mientras se procesa.
 *      - Mensajes claros tras el éxito (con notify) y tras error.
 *
 *   #3 Control y libertad del usuario
 *      - Botón "Cancelar" siempre disponible (excepto durante el submit).
 *      - Cerrar el modal por X, Escape o click fuera (radix lo da gratis).
 *
 *   #5 Prevención de errores
 *      - Validación inline de longitud mínima ANTES del submit.
 *      - Validación inline de coincidencia entre new y confirm.
 *      - Validación inline: nueva ≠ actual.
 *      - Botón submit deshabilitado mientras haya errores locales o falten campos.
 *
 *   #9 Ayudar a reconocer y recuperarse de errores
 *      - Errores 422 del backend se pintan DEBAJO del campo específico.
 *      - aria-invalid + aria-describedby para lectores de pantalla.
 *      - Error genérico (401, 500) se muestra arriba del form como bloque.
 *
 * Después del éxito:
 *   El backend revoca todos los refresh tokens del usuario. El access
 *   token actual sigue vivo unos minutos, pero por consistencia y para
 *   forzar al usuario a re-loguearse con su NUEVA contraseña (acto que
 *   refuerza la memoria muscular), se hace logout local + redirect a
 *   /login con un mensaje informativo.
 */
export const ChangePasswordModal = ({
    open,
    onOpenChange,
}: ChangePasswordModalProps) => {
    const navigate = useNavigate();
    const logout = useAuthStore((state) => state.logout);

    const [form, setForm] = useState<ChangePasswordPayload>(INITIAL_FORM);
    const [visibility, setVisibility] = useState<FieldVisibility>(INITIAL_VISIBILITY);

    // Errores por campo del backend (422). Se mantienen en estado separado
    // de los errores locales (validación inline) porque tienen vida útil
    // distinta: los del backend se limpian al editar el campo, los locales
    // se recalculan en cada render.
    const [serverErrors, setServerErrors] = useState<ChangePasswordFieldErrors>({});

    // Mensaje de error global (401, 500, red). Se pinta arriba del form.
    const [globalError, setGlobalError] = useState<string>("");

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Ref al primer input — para auto-focus al abrir (Heurística #7:
    // flexibilidad y eficiencia para el usuario experto, que puede
    // empezar a teclear sin tocar el ratón).
    const currentPasswordRef = useRef<HTMLInputElement>(null);

    // ── Reset al cerrar el modal ────────────────────────────────────────────────
    // Evita que datos sensibles queden en memoria de React entre aperturas
    // y previene que el usuario vea el estado anterior al volver a abrir.
    useEffect(() => {
        if (!open) {
            setForm(INITIAL_FORM);
            setVisibility(INITIAL_VISIBILITY);
            setServerErrors({});
            setGlobalError("");
            setIsSubmitting(false);
        }
    }, [open]);

    // ── Auto-focus al primer campo al abrir ─────────────────────────────────────
    // Pequeño delay para que el dialog termine su animación de apertura.
    // Sin esto, el focus se aplica antes de que el input sea "visible"
    // y el navegador puede ignorarlo.
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                currentPasswordRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [open]);

    // ── Validación local en tiempo real ─────────────────────────────────────────
    // Estos errores se muestran inmediatamente al usuario sin tocar el
    // backend. El backend revalida al hacer submit (defensa en profundidad).
    //
    // Solo se muestran cuando el campo tiene al menos un carácter — no
    // queremos pintar "muy corta" en un campo vacío que el usuario aún
    // no terminó de escribir (Heurística #5: prevenir errores sin agobiar).
    const localErrors: ChangePasswordFieldErrors = {};

    if (
        form.new_password.length > 0 &&
        form.new_password.length < MIN_PASSWORD_LENGTH
    ) {
        localErrors.new_password = [
            `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
        ];
    }

    if (
        form.new_password.length >= MIN_PASSWORD_LENGTH &&
        form.current_password.length > 0 &&
        form.new_password === form.current_password
    ) {
        localErrors.new_password = [
            "La nueva contraseña debe ser distinta a la actual",
        ];
    }

    if (
        form.confirm_password.length > 0 &&
        form.new_password !== form.confirm_password
    ) {
        localErrors.confirm_password = ["Las contraseñas no coinciden"];
    }

    // Helper para obtener el error de un campo (server tiene prioridad sobre local).
    // Se prefiere el error del backend porque es más autoritativo: si el
    // backend rechazó el payload por una razón distinta a las que validamos
    // localmente, queremos que esa razón sea la que ve el usuario.
    const getFieldError = (
        field: keyof ChangePasswordFieldErrors,
    ): string | null => {
        const serverErr = serverErrors[field]?.[0];
        if (serverErr) return serverErr;

        const localErr = localErrors[field]?.[0];
        return localErr ?? null;
    };

    // ── Handler de cambio de cualquier input ───────────────────────────────────
    // Limpia el error del backend de ESE campo cuando el usuario edita —
    // patrón estándar en formularios: si te equivocaste pero ya estás
    // corrigiendo, no tiene sentido seguir mostrando el error viejo.
    const handleChange = (field: keyof ChangePasswordPayload) =>
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = event.target.value;

            setForm((prev) => ({ ...prev, [field]: value }));

            if (serverErrors[field]) {
                setServerErrors((prev) => {
                    const next = { ...prev };
                    delete next[field];
                    return next;
                });
            }

            // El error global también se limpia con cualquier edición —
            // si el backend devolvió "contraseña actual incorrecta" y el
            // usuario empieza a corregir cualquier campo, el banner ya
            // no debe estar.
            if (globalError) setGlobalError("");
        };

    // ── Toggle de visibilidad por campo ────────────────────────────────────────
    const toggleVisibility = (field: keyof FieldVisibility) => () => {
        setVisibility((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    // ── Botón habilitado ───────────────────────────────────────────────────────
    // Se deshabilita si:
    //   - Está enviándose
    //   - Algún campo está vacío
    //   - Hay errores locales de validación
    // No se valida contra serverErrors porque, una vez el usuario edita,
    // el handleChange los limpia — cuando hay serverError persistente
    // significa que el usuario aún no ha modificado el campo y el botón
    // debe seguir habilitado para que pueda reintentar tras editar.
    const allFieldsFilled =
        form.current_password.length > 0 &&
        form.new_password.length > 0 &&
        form.confirm_password.length > 0;

    const hasLocalErrors = Object.keys(localErrors).length > 0;

    const canSubmit = !isSubmitting && allFieldsFilled && !hasLocalErrors;

    // ── Submit ──────────────────────────────────────────────────────────────────
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) return;

        setIsSubmitting(true);
        setGlobalError("");
        setServerErrors({});

        try {
            const result = await authService.changePassword(form);

            if (result.kind === "success") {
                // Notificación clara antes de redirigir. Duración un poco
                // mayor que el default (3s) porque el mensaje incluye dos
                // ideas: "se cambió" + "se cerraron otras sesiones".
                notify.success(
                    "Contraseña actualizada. Inicia sesión nuevamente.",
                    5000,
                );
                // Logout local + redirect. Usamos logout() del store (no un
                // simple navigate) porque queremos que limpie el token en
                // memoria y el flag cgps_had_session para que la próxima
                // visita a /login no muestre "sesión expirada" — eso sería
                // engañoso, el usuario salió por su propia voluntad.
                await logout();
                navigate("/login", { replace: true });
                return;
            }

            if (result.kind === "validation") {
                setServerErrors(result.fields);
                return;
            }

            // result.kind === "error"
            setGlobalError(result.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Helper interno para renderizar un campo de password ─────────────────────
    // Evita repetir 4 veces la misma estructura input + toggle + error.
    // Se mantiene como función dentro del componente (no extracted) porque
    // depende de muchos estados locales — sacarlo afuera implicaría pasar
    // ~8 props y reduciría legibilidad.
    const renderPasswordField = (
        field: keyof ChangePasswordPayload,
        label: string,
        options?: { autoComplete?: string; ref?: React.RefObject<HTMLInputElement | null> },
    ) => {
        const error = getFieldError(field);
        const errorId = `${field}-error`;

        return (
            <div className="flex w-full flex-col gap-2">
                <Label htmlFor={field}>{label}</Label>
                <div className="relative">
                    <Input
                        id={field}
                        name={field}
                        ref={options?.ref}
                        type={visibility[field] ? "text" : "password"}
                        value={form[field]}
                        onChange={handleChange(field)}
                        disabled={isSubmitting}
                        autoComplete={options?.autoComplete}
                        // a11y: marca el campo como inválido para lectores de pantalla
                        // y enlaza con el id del mensaje de error.
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? errorId : undefined}
                        className={cn(
                            "h-11 pr-12",
                            error && "border-rose-400 focus-visible:ring-rose-300",
                        )}
                    />
                    <button
                        type="button"
                        onClick={toggleVisibility(field)}
                        disabled={isSubmitting}
                        aria-label={
                            visibility[field] ? "Ocultar contraseña" : "Mostrar contraseña"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-40"
                    >
                        {visibility[field] ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                </div>

                {/* Espacio reservado para el mensaje de error.
            role="alert" hace que lectores de pantalla lo anuncien al aparecer.
            min-h evitaría layout shift, pero en un modal pequeño lo
            preferimos tal cual: que el modal crezca un poco al haber error
            no descoloca nada porque está centrado en la pantalla. */}
                {error && (
                    <p
                        id={errorId}
                        role="alert"
                        className="text-xs text-rose-600"
                    >
                        {error}
                    </p>
                )}
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Cambiar contraseña</DialogTitle>
                    <DialogDescription>
                        Por seguridad, las sesiones en otros dispositivos se cerrarán al
                        actualizar tu contraseña.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* ── Error global del backend ─────────────────────────────────
              Solo aparece si vino un error que NO es de validación por
              campo (ej: 401 contraseña actual incorrecta, 500, red caída).
              Se pinta arriba del form para que sea lo primero que el
              usuario vea al volver al modal tras un fallo. */}
                    {globalError && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                        >
                            {globalError}
                        </div>
                    )}

                    {renderPasswordField("current_password", "Contraseña actual", {
                        autoComplete: "current-password",
                        ref: currentPasswordRef,
                    })}

                    {renderPasswordField("new_password", "Nueva contraseña", {
                        autoComplete: "new-password",
                    })}

                    {renderPasswordField("confirm_password", "Confirmar nueva contraseña", {
                        autoComplete: "new-password",
                    })}

                    {/* Hint discreto de la regla — Heurística #6: reconocer
              en lugar de recordar. El usuario no tiene que adivinar
              cuál es la longitud mínima, la ve antes de equivocarse. */}
                    <p className="text-xs text-slate-500">
                        La nueva contraseña debe tener al menos {MIN_PASSWORD_LENGTH}{" "}
                        caracteres.
                    </p>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={!canSubmit}>
                            {isSubmitting && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isSubmitting ? "Cambiando..." : "Cambiar contraseña"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};