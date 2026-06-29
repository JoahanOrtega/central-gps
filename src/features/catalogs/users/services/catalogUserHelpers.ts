// ─── Helpers de transformación form ↔ payload ────────────────────────────────
//
// Centraliza la traducción entre el shape UI-friendly del wizard
// (WizardFormState con arrays, strings, Sets) y los payloads que el
// backend espera (CreateUserSchema con strings concatenadas, números,
// arrays planos).
//
// Por qué separar estos helpers:
//   - El wizard puro maneja UI; no debería mezclar transformaciones de datos.
//   - Permite testear las transformaciones con casos de borde sin montar
//     todo el wizard.
//   - Si en el futuro cambia el formato del backend (ej. dias_acceso pasa
//     a array), solo se cambia aquí — los componentes UI no se enteran.

import type {
    WizardFormState,
    CreateUserPayload,
    UpdateUserPayload,
    UserDetail,
    RolCreable,
    TipoAcceso,
} from "../types/user.types";


// ─── Estado inicial del form (para crear) ────────────────────────────────────
// Defaults sensatos:
//   - rol: "usuario" — el caso más común y menos privilegiado
//   - dias_acceso: vacío — sin restricción de días por defecto
//   - horas: vacías — sin restricción horaria por defecto
//   - tipoAcceso: "personalizar" — el wizard arranca sin permisos seleccionados
//                                 hasta que el usuario elija un preset
export const INITIAL_WIZARD_FORM: WizardFormState = {
    usuario: "",
    clave: "",
    confirm_clave: "",
    nombre: "",
    rol: "usuario",
    email: "",
    telefono: "",
    dias_acceso: [],
    hora_inicio: "",
    hora_fin: "",
    id_grupo_unidades: null,
    id_cliente: null,
    dias_consulta: "",
    tipoAcceso: "personalizar",
    permisosSeleccionados: new Set<number>(),
};


// ─── Form → Payload de CREACIÓN ──────────────────────────────────────────────
/**
 * Construye el payload para POST /catalogs/users desde el form del wizard.
 *
 * Decisiones importantes:
 *   - dias_acceso: array → string "L,M,X,J,V" (formato del backend).
 *   - horas: añadir ":00" para formato HH:MM:SS si vino solo HH:MM
 *     (input nativo type=time devuelve HH:MM).
 *   - email/telefono: enviar null si vino vacío (no string "").
 *     El backend acepta None en columna nullable, pero NO debería
 *     guardar "" porque genera ruido en queries de filtrado.
 *   - dias_consulta: string del input → number. NaN → 0 (default).
 *   - permisos: Set → Array (Set no es serializable a JSON).
 */
export function buildCreatePayload(form: WizardFormState): CreateUserPayload {
    const dias_acceso = form.dias_acceso.join(",");
    const dias_consulta_int = parseInt(form.dias_consulta, 10);

    return {
        datos: {
            usuario: form.usuario.trim(),
            clave: form.clave,
            nombre: form.nombre.trim(),
            rol: form.rol,
            email: form.email.trim() || null,
            telefono: form.telefono.trim() || null,
        },
        restricciones: {
            // Spread condicional: solo incluir los campos que tienen valor.
            // Marshmallow en backend usa load_default para los omitidos —
            // no necesitamos enviarlos vacíos.
            ...(dias_acceso && { dias_acceso }),
            ...(form.hora_inicio && { hora_inicio_acceso: `${form.hora_inicio}:00` }),
            ...(form.hora_fin && { hora_fin_acceso: `${form.hora_fin}:00` }),
            ...(form.id_grupo_unidades !== null && {
                id_grupo_unidades: form.id_grupo_unidades,
            }),
            ...(form.id_cliente !== null && { id_cliente: form.id_cliente }),
            ...(!Number.isNaN(dias_consulta_int) && { dias_consulta: dias_consulta_int }),
        },
        permisos: {
            id_permisos: Array.from(form.permisosSeleccionados),
        },
    };
}


// ─── Form → Payload de EDICIÓN ───────────────────────────────────────────────
/**
 * Construye el payload PATCH para /catalogs/users/<id> calculando el
 * DIFF entre el estado original del usuario y el form actual.
 *
 * Solo se envían las secciones que cambiaron — esto refleja la semántica
 * de PATCH: el backend NO toca lo que no se le envía.
 *
 * Caso especial de permisos:
 *   - Si la lista cambió en CUALQUIER manera (agregado, quitado, total
 *     diferente) → enviamos la lista completa actual.
 *   - Si la lista es idéntica → no enviamos la sección.
 *   - Si quedaron 0 permisos seleccionados (cuando antes había) → enviamos
 *     {permisos: {id_permisos: []}}, lo cual el backend interpreta como
 *     "desasignar todos".
 */
export function buildUpdatePayload(
    form: WizardFormState,
    original: UserDetail,
    puedeEditarLogin = false,
): UpdateUserPayload {
    const payload: UpdateUserPayload = {};

    // ── Sección "datos" ─────────────────────────────────────────────────
    // El campo `usuario` (login) NO se edita — el wizard de edición
    // ni siquiera lo muestra editable. Email y teléfono comparan contra
    // los valores normalizados (string vacío vs null del backend).

    const datosChanges: NonNullable<UpdateUserPayload["datos"]> = {};

    if (form.nombre.trim() !== original.datos.nombre) {
        datosChanges.nombre = form.nombre.trim();
    }
    if (form.rol !== original.datos.rol) {
        datosChanges.rol = form.rol as RolCreable;
    }
    // En este sistema, "email" del wizard se mapea al campo "usuario" del
    // backend (no hay columna email separada). Para la mayoría de roles el
    // "usuario" es inmutable, así que NO se envía. Solo si quien edita tiene
    // permiso (usuarios.editar, o sudo) lo incluimos en el diff.
    if (puedeEditarLogin && form.email.trim() !== original.datos.email) {
        datosChanges.email = form.email.trim();
    }
    const telefonoNorm = form.telefono.trim() || null;
    if (telefonoNorm !== original.datos.telefono) {
        datosChanges.telefono = telefonoNorm;
    }

    if (Object.keys(datosChanges).length > 0) {
        payload.datos = datosChanges;
    }

    // ── Sección "restricciones" ─────────────────────────────────────────
    // Comparamos campo por campo y enviamos la sección COMPLETA si hay
    // cualquier cambio. El backend valida horas cruzadas (inicio < fin),
    // así que conviene enviarlas juntas para que la validación tenga
    // contexto completo.

    const dias_acceso_actual = form.dias_acceso.join(",");
    const hora_inicio_actual = form.hora_inicio ? `${form.hora_inicio}:00` : "";
    const hora_fin_actual = form.hora_fin ? `${form.hora_fin}:00` : "";
    const dias_consulta_actual = parseInt(form.dias_consulta, 10);
    const dias_consulta_normalizado = Number.isNaN(dias_consulta_actual)
        ? 0
        : dias_consulta_actual;

    const restriccionesCambio =
        dias_acceso_actual !== original.restricciones.dias_acceso ||
        hora_inicio_actual !== original.restricciones.hora_inicio_acceso ||
        hora_fin_actual !== original.restricciones.hora_fin_acceso ||
        form.id_grupo_unidades !== original.restricciones.id_grupo_unidades ||
        form.id_cliente !== original.restricciones.id_cliente ||
        dias_consulta_normalizado !== original.restricciones.dias_consulta;

    if (restriccionesCambio) {
        payload.restricciones = {
            dias_acceso: dias_acceso_actual,
            ...(hora_inicio_actual && { hora_inicio_acceso: hora_inicio_actual }),
            ...(hora_fin_actual && { hora_fin_acceso: hora_fin_actual }),
            id_grupo_unidades: form.id_grupo_unidades,
            id_cliente: form.id_cliente,
            dias_consulta: dias_consulta_normalizado,
        };
    }

    // ── Sección "permisos" ──────────────────────────────────────────────
    // Comparamos los conjuntos. Si difieren en cualquier manera, enviamos
    // la lista completa actual (el backend la trata como reemplazo total).

    const permisosActuales = Array.from(form.permisosSeleccionados).sort();
    const permisosOriginales = [...original.permisos.id_permisos].sort();

    const permisosCambiaron =
        permisosActuales.length !== permisosOriginales.length ||
        permisosActuales.some((id, idx) => id !== permisosOriginales[idx]);

    if (permisosCambiaron) {
        payload.permisos = { id_permisos: permisosActuales };
    }

    return payload;
}


// ─── UserDetail → WizardFormState (pre-llenar el wizard de edición) ──────────
/**
 * Convierte el detalle del usuario que devuelve el backend al shape que
 * el wizard maneja internamente.
 *
 *   - Convertir string "L,M,X" → array ["L", "M", "X"] para los checkboxes.
 *     Un string vacío produce array vacío (no [""]).
 *   - Convertir "HH:MM:SS" → "HH:MM" para el input nativo type=time.
 *   - Convertir array → Set para que el toggle de permisos sea O(1).
 *   - Las contraseñas siempre vacías — no se pre-llenan ni se editan
 *     desde el wizard. Si el sudo_erp quiere resetear, usa el endpoint
 *     exclusivo /admin-erp/.../reset-password.
 *   - tipoAcceso siempre arranca en "personalizar" en edición — el usuario
 *     puede cambiar al preset rápido si lo desea. No detectamos el tipo
 *     desde la lista actual porque sería ambiguo (¿"total" si tiene 117
 *     permisos? ¿qué pasa cuando hay 116 + el de creación nuevo?).
 */
export function detailToFormState(detail: UserDetail): WizardFormState {
    return {
        // Step 1 — datos
        usuario: detail.datos.usuario,
        clave: "",                  // siempre vacía en modo edición
        confirm_clave: "",
        nombre: detail.datos.nombre,
        rol: (detail.datos.rol === "admin_empresa" ? "admin_empresa" : "usuario") as RolCreable,
        email: detail.datos.email || "",
        telefono: detail.datos.telefono ?? "",

        // Step 2 — restricciones
        dias_acceso: detail.restricciones.dias_acceso
            ? detail.restricciones.dias_acceso.split(",").map((d) => d.trim())
            : [],
        hora_inicio: trimSeconds(detail.restricciones.hora_inicio_acceso),
        hora_fin: trimSeconds(detail.restricciones.hora_fin_acceso),
        id_grupo_unidades: detail.restricciones.id_grupo_unidades,
        id_cliente: detail.restricciones.id_cliente,
        dias_consulta: String(detail.restricciones.dias_consulta || ""),

        // Step 3 — permisos
        tipoAcceso: "personalizar" as TipoAcceso,
        permisosSeleccionados: new Set(detail.permisos.id_permisos),
    };
}


// ─── Helpers privados ─────────────────────────────────────────────────────────

/**
 * "08:30:00" → "08:30" para que input type="time" lo acepte.
 * Strings vacíos quedan vacíos.
 */
function trimSeconds(time: string | null | undefined): string {
    if (!time) return "";
    // Recorta la parte de segundos si está presente (HH:MM:SS → HH:MM).
    return time.length >= 5 ? time.slice(0, 5) : time;
}