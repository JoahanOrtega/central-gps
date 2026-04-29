import { useEffect, useRef, useState } from "react";
import {
    Building2,
    Clock,
    MoreHorizontal,
    Pencil,
    Phone,
    UserMinus,
    Users,
} from "lucide-react";
import type { UserListItem } from "../types/user.types";

// ─── Estilos por rol ──────────────────────────────────────────────────────────
// Cada rol se muestra con un chip de color que comunica jerarquía:
//   - sudo_erp:      ámbar (rol de sistema, aparece raro en este catálogo)
//   - admin_empresa: azul (rol elevado dentro de la empresa)
//   - usuario:       gris (rol estándar)
const ROL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    sudo_erp: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        label: "Administrador del sistema",
    },
    admin_empresa: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        label: "Admin. de empresa",
    },
    usuario: {
        bg: "bg-slate-100",
        text: "text-slate-600",
        label: "Usuario",
    },
};

// ── Helper para obtener iniciales del nombre ────────────────────────────────
// Toma la primera letra del primer nombre y la primera del último apellido.
// Si solo hay una palabra, toma sus dos primeras letras.
// Si está vacío, retorna "?" como fallback visual.
//
// Ejemplos:
//   "Juan Pérez García"  → "JG"
//   "María"              → "MA"
//   ""                   → "?"
function getIniciales(nombre: string): string {
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return "?";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

// ── Helper para formatear horario de acceso ─────────────────────────────────
// Convierte hora_inicio_acceso y hora_fin_acceso (formato "HH:MM:SS") en
// un string legible para mostrar en la card.
//   - "00:00:00" + "23:59:59" → "Sin restricción de horario"
//   - "08:00:00" + "18:00:00" → "08:00 — 18:00"
function formatHorario(inicio: string | null, fin: string | null): string {
    if (!inicio || !fin) return "Sin restricción de horario";

    // Si el horario es 00:00 - 23:59, no es restrictivo. Mostramos eso
    // explícitamente para que el usuario sepa que no hay límite.
    const sinRestriccion =
        inicio.startsWith("00:00") &&
        (fin.startsWith("23:59") || fin.startsWith("23:00"));

    if (sinRestriccion) return "Sin restricción de horario";

    // Quitar segundos para una visualización más limpia.
    return `${inicio.slice(0, 5)} — ${fin.slice(0, 5)}`;
}

// ── Helper para formatear días de acceso ─────────────────────────────────────
// "L,M,X,J,V" → "L · M · X · J · V" (más legible visualmente)
// "" → "Todos los días"
// Si selecciona los 7 días, también dice "Todos los días" para no saturar
// la card con "L · M · X · J · V · S · D".
function formatDiasAcceso(dias: string): string {
    const trimmed = dias.trim();
    if (!trimmed) return "Todos los días";

    const partes = trimmed.split(",").map((d) => d.trim()).filter(Boolean);
    if (partes.length === 7) return "Todos los días";

    return partes.join(" · ");
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface UserCardProps {
    user: UserListItem;
    // Visible solo si el usuario logueado tiene 'usuarios.editar'.
    canEdit?: boolean;
    // Visible solo si tiene 'usuarios.inhabilitar'.
    canInhabilitar?: boolean;
    // Si el id del usuario logueado coincide con esta card, no se muestra
    // la opción "Inhabilitar" — el backend ya lo rechazaría con 403, pero
    // ocultarlo en UI es mejor UX (Heurística #5: prevenir errores).
    isSelf?: boolean;
    // Callback al hacer click en "Editar". Recibe el usuario completo.
    onEdit?: (user: UserListItem) => void;
    // Callback al hacer click en "Inhabilitar". Recibe el usuario completo
    // para que el ConfirmDialog pueda mostrar el nombre.
    onInhabilitar?: (user: UserListItem) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export const UserCard = ({
    user,
    canEdit = false,
    canInhabilitar = false,
    isSelf = false,
    onEdit,
    onInhabilitar,
}: UserCardProps) => {
    // Menú kebab: abierto/cerrado + ref para detectar clicks fuera.
    // Mismo patrón que UnitCard / PoiCard del PR 3 — consistencia entre
    // catálogos.
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    useEffect(() => {
        if (!menuOpen) return;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setMenuOpen(false);
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [menuOpen]);

    const handleEditClick = () => {
        setMenuOpen(false);
        onEdit?.(user);
    };

    const handleInhabilitarClick = () => {
        setMenuOpen(false);
        onInhabilitar?.(user);
    };

    // Inhabilitar se oculta si:
    //   - El usuario logueado no tiene permiso, o
    //   - Es la card del usuario logueado (no se puede auto-inhabilitar), o
    //   - El target es un sudo_erp (regla del backend: no se puede inhabilitar).
    const showInhabilitar =
        canInhabilitar && !isSelf && user.rol !== "sudo_erp";
    const hasAnyAction = canEdit || showInhabilitar;

    const rolStyle = ROL_STYLES[user.rol] ?? ROL_STYLES.usuario;
    const iniciales = getIniciales(user.nombre);

    return (
        <article className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                {/* ── Bloque izquierdo: avatar + nombre + email + chip ── */}
                <div className="flex flex-1 items-start gap-3 min-w-0">
                    {/* Avatar con iniciales — no usamos imagen porque en el legacy
                        no hay foto persistida (decidiste omitirla en este PR).
                        Iniciales en un círculo de color es el patrón estándar
                        cuando no hay foto disponible (Slack, Linear, GitHub). */}
                    <div
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700"
                    >
                        {iniciales}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3
                            className="truncate text-base font-semibold text-slate-800"
                            title={user.nombre}
                        >
                            {user.nombre}
                        </h3>
                        {/* break-all evita que un email largo desborde la card.
                            Preferimos romper palabra que ocultar info útil con
                            truncate. */}
                        <p className="break-all text-xs text-slate-500">{user.usuario}</p>

                        <span
                            className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${rolStyle.bg} ${rolStyle.text}`}
                        >
                            {rolStyle.label}
                        </span>

                        {/* Indicador "(Tú)" si es la card del usuario logueado.
                            Heurística #1: visibilidad — el usuario debe saber
                            cuál fila es la suya cuando la lista es larga. */}
                        {isSelf && (
                            <span className="ml-2 text-[11px] text-slate-400">(Tú)</span>
                        )}
                    </div>
                </div>

                {/* ── Bloque derecho: kebab menu ── */}
                {hasAnyAction && (
                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            aria-label={`Acciones de ${user.nombre}`}
                            onClick={() => setMenuOpen((prev) => !prev)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                        >
                            <MoreHorizontal className="h-5 w-5" />
                        </button>

                        {menuOpen && (
                            <div
                                role="menu"
                                className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
                            >
                                {canEdit && (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={handleEditClick}
                                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                        <Pencil className="h-4 w-4 text-slate-500" />
                                        Editar
                                    </button>
                                )}

                                {/* Separador entre acción neutra (editar) y
                                    acción "destructiva" (inhabilitar).
                                    Refuerza visualmente que son dos categorías. */}
                                {canEdit && showInhabilitar && (
                                    <div
                                        className="border-t border-slate-100"
                                        aria-hidden="true"
                                    />
                                )}

                                {showInhabilitar && (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={handleInhabilitarClick}
                                        // Ámbar (no rojo) porque inhabilitar NO es
                                        // eliminar — es reversible. Diferenciamos
                                        // visualmente para que el usuario entienda
                                        // que es menos destructivo que un delete.
                                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-amber-700 hover:bg-amber-50"
                                    >
                                        <UserMinus className="h-4 w-4" />
                                        Inhabilitar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Info adicional debajo (teléfono, grupo, cliente, horario) ──
                Solo se renderiza cada línea si el dato existe — evita
                mostrar "Teléfono: —" cuando no hay nada útil que mostrar. */}
            <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                {user.telefono && (
                    <div className="flex items-center gap-2">
                        <Phone
                            className="h-3.5 w-3.5 shrink-0 text-slate-400"
                            aria-hidden="true"
                        />
                        <span>{user.telefono}</span>
                    </div>
                )}

                {user.nombre_grupo_unidades && (
                    <div className="flex items-center gap-2">
                        <Users
                            className="h-3.5 w-3.5 shrink-0 text-slate-400"
                            aria-hidden="true"
                        />
                        <span className="truncate" title={user.nombre_grupo_unidades}>
                            Grupo: {user.nombre_grupo_unidades}
                        </span>
                    </div>
                )}

                {user.nombre_cliente && (
                    <div className="flex items-center gap-2">
                        <Building2
                            className="h-3.5 w-3.5 shrink-0 text-slate-400"
                            aria-hidden="true"
                        />
                        <span className="truncate" title={user.nombre_cliente}>
                            Cliente: {user.nombre_cliente}
                        </span>
                    </div>
                )}

                {/* Línea con días + horario en una sola fila para ahorrar altura.
                    Esta info siempre se muestra (incluso "Todos los días" /
                    "Sin restricción de horario") porque es relevante para
                    saber cuándo puede acceder el usuario. */}
                <div className="flex items-center gap-2">
                    <Clock
                        className="h-3.5 w-3.5 shrink-0 text-slate-400"
                        aria-hidden="true"
                    />
                    <span className="truncate">
                        {formatDiasAcceso(user.dias_acceso)} ·{" "}
                        {formatHorario(user.hora_inicio_acceso, user.hora_fin_acceso)}
                    </span>
                </div>
            </div>
        </article>
    );
};