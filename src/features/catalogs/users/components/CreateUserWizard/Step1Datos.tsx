import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type {
    WizardFormState,
    UserFieldErrors,
    RolCreable,
} from "../../types/user.types";

// ─── Constantes de validación ─────────────────────────────────────────────────
// Espejo del backend (CreateUserSchema y UpdateUserSchema).
// Si cambian las reglas allá, actualizar aquí también.
const USUARIO_MIN = 3;
const USUARIO_MAX = 100;
const CLAVE_MIN = 8;
const CLAVE_MAX = 128;
const NOMBRE_MIN = 2;
const NOMBRE_MAX = 200;

interface Step1DatosProps {
    form: WizardFormState;
    onChange: (patch: Partial<WizardFormState>) => void;
    serverErrors: UserFieldErrors["datos"];
    allowedRoles: RolCreable[];
    // ── Modo edición ────────────────────────────────────────────────────
    // Cuando viene true, el step omite los campos de contraseña y deshabilita
    // el campo "usuario" porque es el login y NO se puede cambiar (rompería
    // referencias históricas en logs y auditoría).
    isEditMode: boolean;
    // ¿Quien edita puede cambiar el login (usuario/email)? Viene del permiso
    // el permiso "usuarios.editar" (sudo_erp por bypass). En creación no
    // aplica — el login siempre es editable al crear.
    puedeEditarLogin: boolean;
}

export const Step1Datos = ({
    form,
    onChange,
    serverErrors,
    allowedRoles,
    isEditMode,
    puedeEditarLogin,
}: Step1DatosProps) => {
    // Toggles de visibilidad de password — estado local (no afecta otros steps).
    // En modo edición no se renderizan estos campos así que el state queda
    // muerto pero inocuo.
    const [showClave, setShowClave] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // El login (usuario/email) se bloquea solo si estamos editando Y quien
    // edita NO tiene permiso para cambiarlo. Al crear siempre es editable.
    const bloqueoLogin = isEditMode && !puedeEditarLogin;

    // ─── Validación local en tiempo real ──────────────────────────────────
    // Solo se muestran errores cuando el usuario ya escribió algo —
    // un campo vacío al abrir el wizard no debe gritar "campo requerido".
    const usuarioError = (() => {
        if (form.usuario.length === 0) return null;
        if (form.usuario.length < USUARIO_MIN)
            return `El usuario debe tener al menos ${USUARIO_MIN} caracteres`;
        return null;
    })();

    const claveError = (() => {
        if (isEditMode) return null;  // no se valida en edición — campo no existe
        if (form.clave.length === 0) return null;
        if (form.clave.length < CLAVE_MIN)
            return `La contraseña debe tener al menos ${CLAVE_MIN} caracteres`;
        return null;
    })();

    const confirmError = (() => {
        if (isEditMode) return null;
        if (form.confirm_clave.length === 0) return null;
        if (form.clave !== form.confirm_clave) return "Las contraseñas no coinciden";
        return null;
    })();

    const nombreError = (() => {
        if (form.nombre.length === 0) return null;
        if (form.nombre.length < NOMBRE_MIN)
            return `El nombre debe tener al menos ${NOMBRE_MIN} caracteres`;
        return null;
    })();

    // Email: solo validamos formato si el usuario escribió algo.
    // Es opcional — vacío es válido.
    const emailError = (() => {
        if (form.email.length === 0) return null;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Email inválido";
        return null;
    })();

    // ── Helper para obtener error: server tiene prioridad sobre local ──────
    // Si el backend dijo "ya existe", queremos mostrar ese error preciso
    // por encima del local "longitud OK". Una vez el usuario edita el campo,
    // el padre limpia el server error y aparece el local si aplica.
    const getError = (
        field: keyof NonNullable<UserFieldErrors["datos"]>,
        localError: string | null,
    ): string | null => {
        const serverErr = serverErrors?.[field]?.[0];
        return serverErr ?? localError;
    };

    return (
        <div className="flex flex-col gap-4">
            {/* ── Usuario (login) ── */}
            {/* En modo edición se muestra deshabilitado para que el admin
                vea cuál login está editando, pero no pueda cambiarlo. */}
            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor="wiz-usuario"
                    className="text-sm font-medium text-slate-700"
                >
                    Usuario {!isEditMode && <span className="text-rose-500">*</span>}
                </label>
                <input
                    id="wiz-usuario"
                    type="text"
                    value={form.usuario}
                    onChange={(e) => onChange({ usuario: e.target.value })}
                    maxLength={USUARIO_MAX}
                    autoComplete="off"
                    placeholder="ej. juan.perez o juan@empresa.com"
                    disabled={bloqueoLogin}
                    aria-invalid={Boolean(getError("usuario", usuarioError))}
                    aria-describedby={
                        getError("usuario", usuarioError) ? "wiz-usuario-error" : undefined
                    }
                    className={`h-10 rounded-lg border px-3 text-sm outline-none transition-colors ${getError("usuario", usuarioError)
                        ? "border-rose-300 focus:border-rose-400"
                        : "border-slate-300 focus:border-blue-400"
                        } ${bloqueoLogin ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""
                        }`}
                />
                {getError("usuario", usuarioError) && (
                    <p id="wiz-usuario-error" role="alert" className="text-xs text-rose-600">
                        {getError("usuario", usuarioError)}
                    </p>
                )}
                <p className="text-xs text-slate-400">
                    {bloqueoLogin
                        ? "El nombre de usuario no se puede modificar."
                        : "Será su nombre de inicio de sesión. No podrá cambiarlo después."}
                </p>
            </div>

            {/* ── Nombre completo ── */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="wiz-nombre" className="text-sm font-medium text-slate-700">
                    Nombre completo <span className="text-rose-500">*</span>
                </label>
                <input
                    id="wiz-nombre"
                    type="text"
                    value={form.nombre}
                    onChange={(e) => onChange({ nombre: e.target.value })}
                    maxLength={NOMBRE_MAX}
                    placeholder="Nombre real de la persona"
                    aria-invalid={Boolean(getError("nombre", nombreError))}
                    aria-describedby={
                        getError("nombre", nombreError) ? "wiz-nombre-error" : undefined
                    }
                    className={`h-10 rounded-lg border px-3 text-sm outline-none transition-colors ${getError("nombre", nombreError)
                        ? "border-rose-300 focus:border-rose-400"
                        : "border-slate-300 focus:border-blue-400"
                        }`}
                />
                {getError("nombre", nombreError) && (
                    <p id="wiz-nombre-error" role="alert" className="text-xs text-rose-600">
                        {getError("nombre", nombreError)}
                    </p>
                )}
            </div>

            {/* ── Rol — solo se muestra si hay más de una opción ──
                Si allowedRoles tiene un solo elemento, lo aplicamos automáticamente
                y NO mostramos el selector. UX más simple cuando no hay decisión. */}
            {allowedRoles.length > 1 && (
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="wiz-rol" className="text-sm font-medium text-slate-700">
                        Rol <span className="text-rose-500">*</span>
                    </label>
                    <select
                        id="wiz-rol"
                        value={form.rol}
                        onChange={(e) => onChange({ rol: e.target.value as RolCreable })}
                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-400"
                    >
                        {allowedRoles.map((rol) => (
                            <option key={rol} value={rol}>
                                {rol === "admin_empresa" ? "Administrador de empresa" : "Usuario"}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-400">
                        {form.rol === "admin_empresa"
                            ? "Tendrá acceso completo a todos los módulos de la empresa."
                            : "Acceso limitado según los permisos que asignes en el paso 3."}
                    </p>
                </div>
            )}

            {/* ── Email + Teléfono en grid de 2 columnas en desktop ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="wiz-email" className="text-sm font-medium text-slate-700">
                        Email
                        <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
                    </label>
                    <input
                        id="wiz-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => onChange({ email: e.target.value })}
                        placeholder="usuario@empresa.com"
                        // En modo edición el email es de solo lectura porque
                        // en este sistema "usuario" funciona también como email
                        // y "usuario" es inmutable. Mantener visible pero
                        // disabled comunica la info sin permitir error.
                        disabled={bloqueoLogin}
                        aria-invalid={Boolean(getError("email", emailError))}
                        className={`h-10 rounded-lg border px-3 text-sm outline-none transition-colors ${getError("email", emailError)
                            ? "border-rose-300 focus:border-rose-400"
                            : "border-slate-300 focus:border-blue-400"
                            } ${bloqueoLogin ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""
                            }`}
                    />
                    {getError("email", emailError) && (
                        <p role="alert" className="text-xs text-rose-600">
                            {getError("email", emailError)}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="wiz-telefono"
                        className="text-sm font-medium text-slate-700"
                    >
                        Teléfono
                        <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
                    </label>
                    <input
                        id="wiz-telefono"
                        type="tel"
                        value={form.telefono}
                        onChange={(e) => onChange({ telefono: e.target.value })}
                        maxLength={50}
                        placeholder="+52 55 1234 5678"
                        className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-400"
                    />
                </div>
            </div>

            {/* ── Sección de contraseña — solo en modo creación ──
                En edición, el cambio de password es un flujo separado (reset
                desde Panel ERP). Ocultar estos campos previene cambios
                accidentales por parte del admin. */}
            {!isEditMode && (
                <>
                    <div className="my-2 border-t border-slate-200" aria-hidden="true" />

                    {/* ── Contraseña ── */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="wiz-clave" className="text-sm font-medium text-slate-700">
                            Contraseña <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="wiz-clave"
                                type={showClave ? "text" : "password"}
                                value={form.clave}
                                onChange={(e) => onChange({ clave: e.target.value })}
                                maxLength={CLAVE_MAX}
                                autoComplete="new-password"
                                aria-invalid={Boolean(getError("clave", claveError))}
                                aria-describedby={
                                    getError("clave", claveError) ? "wiz-clave-error" : undefined
                                }
                                className={`h-10 w-full rounded-lg border px-3 pr-10 text-sm outline-none transition-colors ${getError("clave", claveError)
                                    ? "border-rose-300 focus:border-rose-400"
                                    : "border-slate-300 focus:border-blue-400"
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowClave((prev) => !prev)}
                                aria-label={showClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showClave ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {getError("clave", claveError) && (
                            <p id="wiz-clave-error" role="alert" className="text-xs text-rose-600">
                                {getError("clave", claveError)}
                            </p>
                        )}
                        <p className="text-xs text-slate-400">
                            Mínimo {CLAVE_MIN} caracteres. El usuario podrá cambiarla después.
                        </p>
                    </div>

                    {/* ── Confirmar contraseña ── */}
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="wiz-confirm"
                            className="text-sm font-medium text-slate-700"
                        >
                            Confirmar contraseña <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="wiz-confirm"
                                type={showConfirm ? "text" : "password"}
                                value={form.confirm_clave}
                                onChange={(e) => onChange({ confirm_clave: e.target.value })}
                                maxLength={CLAVE_MAX}
                                autoComplete="new-password"
                                aria-invalid={Boolean(confirmError)}
                                aria-describedby={confirmError ? "wiz-confirm-error" : undefined}
                                className={`h-10 w-full rounded-lg border px-3 pr-10 text-sm outline-none transition-colors ${confirmError
                                    ? "border-rose-300 focus:border-rose-400"
                                    : "border-slate-300 focus:border-blue-400"
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm((prev) => !prev)}
                                aria-label={
                                    showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showConfirm ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {confirmError && (
                            <p id="wiz-confirm-error" role="alert" className="text-xs text-rose-600">
                                {confirmError}
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};