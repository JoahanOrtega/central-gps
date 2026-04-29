import { Fragment, useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ChevronDown, ChevronUp, ClipboardList, Filter, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAuditoria } from "../services/erpService";
import type { RegistroAuditoria } from "../types/erp.types";
import { queryKeys } from "@/lib/query-keys";

// ── Estilos por tipo de acción ───────────────────────────────────────────────
// Cada acción del backend (CREATE, UPDATE, DELETE, etc.) se pinta con un
// color que comunica intuitivamente su naturaleza:
//   - verde:  acciones constructivas (CREATE, ACTIVATE)
//   - azul:   modificaciones (UPDATE)
//   - rojo:   destructivas (DELETE)
//   - ámbar:  pausas/suspensiones (SUSPEND)
//   - violeta y slate: cambios de roles administrativos
//   - sky:    eventos de sesión (LOGIN)
const ACCION_STYLES: Record<string, string> = {
    CREATE: "bg-emerald-50 text-emerald-700",
    UPDATE: "bg-blue-50 text-blue-700",
    DELETE: "bg-red-50 text-red-700",
    SUSPEND: "bg-amber-50 text-amber-700",
    ACTIVATE: "bg-emerald-50 text-emerald-700",
    PROMOTE_ADMIN: "bg-violet-50 text-violet-700",
    REVOKE_ADMIN: "bg-slate-100 text-slate-600",
    LOGIN: "bg-sky-50 text-sky-700",
};
const accionStyle = (a: string) => ACCION_STYLES[a] ?? "bg-slate-100 text-slate-600";

// Entidades disponibles para filtrar. La opción vacía representa "todas".
const ENTIDADES = ["", "empresa", "usuario", "usuario_empresa", "permiso"];

// ── Formateadores de fecha ──────────────────────────────────────────────────
// Dos formatos según contexto:
//   - largo:  para desktop, donde hay espacio (ej. "27 abr 2026, 03:50 p.m.")
//   - corto:  para las cards mobile, donde el espacio es premium
//             (ej. "27 abr · 03:50 p.m.")
//
// Mantenerlos separados (en lugar de un único formateador con prop) hace
// más explícito el porqué de cada visualización.
const formatFechaLarga = (iso: string) =>
    new Date(iso).toLocaleString("es-MX", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });

const formatFechaCorta = (iso: string) => {
    const d = new Date(iso);
    const fecha = d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
    const hora = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    // El separador medio (·) es más legible que un guión y ayuda al ojo a
    // saltar entre las dos piezas de información.
    return `${fecha} · ${hora}`;
};

// ── Headers de la tabla (solo desktop) ──────────────────────────────────────
// IP fue removida: en el deployment actual el backend ve la IP del proxy
// (servidor) en lugar de la del cliente real. Mostrarla daba la falsa
// impresión de que todos los registros venían del mismo origen.
// Si en el futuro se configura X-Forwarded-For correctamente y se lee
// la IP real, se puede reintroducir como columna o como detalle expandible.
const TABLE_HEADERS = ["Fecha", "Usuario", "Entidad", "Acción", "Detalle"];

// Número de columnas para el colSpan de la fila expandida.
// Se calcula desde el array para que, si en el futuro se agregan o quitan
// columnas, no haya que recordar actualizar el colSpan manualmente.
const COLUMN_COUNT = TABLE_HEADERS.length;

// ── Helper: ¿el registro tiene datos para mostrar al expandir? ──────────────
// Compartido entre las dos vistas (card y row). Centralizado para mantener
// la misma regla en ambos lados — si en el futuro agregamos otro campo
// (ej. "metadatos"), cambiar aquí basta.
const tieneDetalle = (reg: RegistroAuditoria) =>
    Boolean(reg.datos_anteriores || reg.datos_nuevos);

// ─── Subcomponente: detalle expandido (compartido card y tabla) ─────────────
// Muestra los JSON de "antes" y "después" lado a lado en desktop, apilados
// en mobile. Se aprovecha en ambas vistas porque la información es la misma.
const DetalleExpandido = ({ registro }: { registro: RegistroAuditoria }) => (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        {registro.datos_anteriores && (
            <div className="flex-1 min-w-0">
                <p className="mb-1.5 text-xs font-medium text-slate-500">Antes</p>
                <pre className="max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
                    {JSON.stringify(registro.datos_anteriores, null, 2)}
                </pre>
            </div>
        )}
        {registro.datos_nuevos && (
            <div className="flex-1 min-w-0">
                <p className="mb-1.5 text-xs font-medium text-slate-500">Después</p>
                <pre className="max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
                    {JSON.stringify(registro.datos_nuevos, null, 2)}
                </pre>
            </div>
        )}
    </div>
);

// ─── Subcomponente: card mobile ─────────────────────────────────────────────
// Una card por registro de auditoría. Diseño jerárquico:
//   - Línea superior:  fecha (izq) + chip de acción (der) — los dos datos
//     que el usuario más busca al escanear el log.
//   - Bloque central:  nombre y email del usuario que ejecutó la acción.
//   - Bloque inferior: chip de entidad + #id + botón de ver detalle.
//
// Por qué chip arriba a la derecha (no abajo):
//   El chip es el indicador visual más fuerte. Ponerlo arriba permite que
//   el usuario escaneando rápidamente vea "qué pasó" antes que "quién y
//   sobre qué". Eye-tracking studies en interfaces de logs confirman que
//   el corner superior derecho es el segundo punto de fijación tras el
//   timestamp.
interface AuditoriaCardProps {
    registro: RegistroAuditoria;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

const AuditoriaCard = ({ registro, isExpanded, onToggleExpand }: AuditoriaCardProps) => {
    const hasDetail = tieneDetalle(registro);

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
            {/* ── Línea superior: fecha + chip de acción ── */}
            <div className="mb-2 flex items-start justify-between gap-2">
                <span className="text-xs text-slate-500">
                    {formatFechaCorta(registro.fecha_registro)}
                </span>
                <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${accionStyle(registro.accion)}`}
                >
                    {registro.accion}
                </span>
            </div>

            {/* ── Usuario ── */}
            <p className="text-sm font-medium text-slate-800">{registro.nombre_usuario}</p>
            {/* break-all evita que un email largo desborde la card.
                truncate haría "...@centralg" lo cual oculta info útil;
                preferimos que rompa palabra para mostrar el email completo. */}
            <p className="mb-2.5 break-all text-xs text-slate-400">
                {registro.email_usuario}
            </p>

            {/* ── Entidad + ID + acción de expandir ── */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                        {registro.entidad}
                    </span>
                    {registro.id_entidad !== null && (
                        <span className="text-xs text-slate-400">#{registro.id_entidad}</span>
                    )}
                </div>

                {hasDetail ? (
                    <button
                        type="button"
                        onClick={onToggleExpand}
                        // aria-expanded comunica el estado a lectores de pantalla.
                        // aria-controls vincularía con el id del detalle, pero
                        // como el detalle se renderiza inline justo debajo,
                        // omitirlo no afecta UX (el flujo es lineal).
                        aria-expanded={isExpanded}
                        className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-emerald-600 transition-colors hover:bg-slate-50"
                    >
                        {isExpanded ? (
                            <>
                                Ocultar
                                <ChevronUp className="h-3 w-3" />
                            </>
                        ) : (
                            <>
                                Ver detalle
                                <ChevronDown className="h-3 w-3" />
                            </>
                        )}
                    </button>
                ) : (
                    <span className="text-xs text-slate-300">—</span>
                )}
            </div>

            {/* ── Detalle expandido ── */}
            {isExpanded && hasDetail && (
                <div className="mt-3 border-t border-slate-200 pt-3">
                    <DetalleExpandido registro={registro} />
                </div>
            )}
        </article>
    );
};

// ─── Subcomponente: fila de tabla desktop ───────────────────────────────────
// Extraída para que el componente principal no termine teniendo 200+ líneas
// de JSX anidado. Mantiene la fila + el expandido como un par cohesivo.
interface AuditoriaTableRowProps {
    registro: RegistroAuditoria;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

const AuditoriaTableRow = ({
    registro,
    isExpanded,
    onToggleExpand,
}: AuditoriaTableRowProps) => {
    const hasDetail = tieneDetalle(registro);

    return (
        <Fragment>
            <tr className="cursor-pointer hover:bg-slate-50" onClick={onToggleExpand}>
                <td className="border-b border-slate-200 px-4 py-3 text-xs whitespace-nowrap text-slate-500">
                    {formatFechaLarga(registro.fecha_registro)}
                </td>
                <td className="border-b border-slate-200 px-4 py-3">
                    <p className="text-xs font-medium text-slate-800">{registro.nombre_usuario}</p>
                    <p className="text-xs text-slate-400">{registro.email_usuario}</p>
                </td>
                <td className="border-b border-slate-200 px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                        {registro.entidad}
                    </span>
                    {registro.id_entidad !== null && (
                        <span className="ml-1.5 text-xs text-slate-400">
                            #{registro.id_entidad}
                        </span>
                    )}
                </td>
                <td className="border-b border-slate-200 px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${accionStyle(registro.accion)}`}>
                        {registro.accion}
                    </span>
                </td>
                <td className="border-b border-slate-200 px-4 py-3 text-xs text-emerald-500">
                    {hasDetail ? (isExpanded ? "Ocultar ▲" : "Ver ▼") : "—"}
                </td>
            </tr>
            {isExpanded && hasDetail && (
                <tr>
                    <td
                        colSpan={COLUMN_COUNT}
                        className="border-b border-slate-200 bg-slate-50 px-6 py-4"
                    >
                        <DetalleExpandido registro={registro} />
                    </td>
                </tr>
            )}
        </Fragment>
    );
};

// ─── Componente principal ───────────────────────────────────────────────────
export const AuditoriaPage = () => {
    useDocumentTitle("Auditoría");
    const [entidad, setEntidad] = useState("");
    const [limit, setLimit] = useState(50);

    // Estado de expansión compartido entre las dos vistas (card mobile y
    // row desktop). Si el usuario expande en mobile y rota a tablet, la
    // misma fila/card sigue expandida sin reset.
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // TanStack Query — los filtros (entidad, limit) son parte de la queryKey.
    // Al cambiar cualquier filtro, se hace una nueva petición automáticamente.
    // refetch() cubre el botón manual de recargar.
    const { data: registros = [], isLoading, error, refetch } = useQuery<RegistroAuditoria[]>({
        queryKey: queryKeys.erp.auditoria(entidad, limit),
        queryFn: () => getAuditoria({ limit, entidad: entidad || undefined }),
    });

    const errorMessage = error instanceof Error ? error.message : null;
    const toggleExpand = (id: number) =>
        setExpandedId((prev) => (prev === id ? null : id));

    const isEmpty =
        !isLoading && !errorMessage && registros.length === 0;
    const hasData =
        !isLoading && !errorMessage && registros.length > 0;

    return (
        <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
            <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">

                {/* ── Cabecera con filtros ────────────────────────────────────
                    Stack vertical en mobile (título arriba, filtros abajo)
                    para que ningún elemento quede recortado.
                    Inline en desktop manteniendo el diseño actual. */}
                <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
                    <div className="flex items-center gap-3">
                        <ClipboardList className="h-5 w-5 shrink-0 text-slate-500" />
                        <div>
                            <h1 className="text-lg font-semibold text-slate-800 md:text-xl">
                                Auditoría
                            </h1>
                            <p className="text-xs text-slate-400">
                                {registros.length} registro{registros.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                    </div>

                    {/* En mobile los filtros se acomodan flex-wrap para que,
                        si el ancho no alcanza, salten a la línea siguiente
                        en lugar de desbordar. */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5">
                            <Filter className="h-3.5 w-3.5 text-slate-400" />
                            <select
                                value={entidad}
                                onChange={(e) => setEntidad(e.target.value)}
                                className="bg-transparent text-sm text-slate-600 outline-none"
                                aria-label="Filtrar por entidad"
                            >
                                <option value="">Todas las entidades</option>
                                {ENTIDADES.filter(Boolean).map((e) => (
                                    <option key={e} value={e}>
                                        {e}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 outline-none"
                            aria-label="Cantidad de registros a mostrar"
                        >
                            {[25, 50, 100, 200].map((n) => (
                                <option key={n} value={n}>
                                    Últimos {n}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            disabled={isLoading}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                            title="Recargar"
                            aria-label="Recargar registros de auditoría"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                {/* ── Contenido principal: estados loading/error/empty/data ──── */}
                <div className="p-4 md:p-6">
                    {isLoading && (
                        <div className="py-10 text-center text-slate-500">
                            Cargando registros...
                        </div>
                    )}
                    {errorMessage && (
                        <div className="py-10 text-center text-red-500">{errorMessage}</div>
                    )}
                    {isEmpty && (
                        <div className="py-10 text-center text-slate-400">
                            No hay registros de auditoría
                        </div>
                    )}

                    {hasData && (
                        <>
                            {/* ─── Vista MOBILE: lista de cards (visible < md) ───
                                space-y-3 en lugar de gap-3 dentro de un grid:
                                space-y aplica sólo entre hijos, no genera un
                                espacio extra al final como gap+grid haría con
                                un solo elemento. */}
                            <div className="space-y-3 md:hidden">
                                {registros.map((reg) => (
                                    <AuditoriaCard
                                        key={reg.id_auditoria}
                                        registro={reg}
                                        isExpanded={expandedId === reg.id_auditoria}
                                        onToggleExpand={() => toggleExpand(reg.id_auditoria)}
                                    />
                                ))}
                            </div>

                            {/* ─── Vista DESKTOP: tabla (visible md+) ───
                                hidden + md:block para que en mobile no se
                                renderice (y no genere el problema original
                                de columnas truncadas). */}
                            <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
                                <table className="w-full border-collapse text-sm">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            {TABLE_HEADERS.map((h) => (
                                                <th
                                                    key={h}
                                                    className="border-b border-slate-200 px-4 py-3 text-left text-xs font-medium"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {registros.map((reg) => (
                                            <AuditoriaTableRow
                                                key={reg.id_auditoria}
                                                registro={reg}
                                                isExpanded={expandedId === reg.id_auditoria}
                                                onToggleExpand={() => toggleExpand(reg.id_auditoria)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
};