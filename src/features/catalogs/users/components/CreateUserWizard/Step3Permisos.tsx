import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPermisos } from "@/features/erp/services/erpService";
import { queryKeys } from "@/lib/query-keys";
import { PermissionAccordion } from "./PermissionAccordion";
import type { PermisoSistema } from "@/features/erp/types/erp.types";
import type { TipoAcceso, WizardFormState } from "../../types/user.types";

// ─── Orden lógico de los módulos en la UI ─────────────────────────────────────
// Definimos un orden pensado en flujo (no alfabético) para que el usuario
// vea los módulos agrupados por área funcional. Los módulos no listados
// aquí aparecen al final ordenados alfabéticamente como fallback.
//
// El orden refleja el flujo del legacy:
//   1. General (sistema, dashboard, mapa)
//   2. Catálogos (lo que el usuario administra)
//   3. Operación (lo que ocurre con esos catálogos)
//   4. Combustible (sub-módulo de operación)
//   5. Reportes (consulta de información histórica)
const MODULE_ORDER = [
    "sistema",
    "dashboard",
    "mapa",
    "unidades",
    "clientes",
    "terminales",
    "operadores",
    "pois",
    "gasolineras",
    "usuarios",
    "rutas",
    "itinerarios",
    "roles_itin",
    "cumplimiento",
    "aforos",
    "turnos_cliente",
    "semaforos",
    "monitor_sem",
    "hist_cumplim",
    "cargas",
    "tickets",
    "reportes",
];

// Sufijo que identifica permisos de "solo lectura" — son los que se activan
// al elegir el preset "Solo lectura". El backend usa esta convención (.ver)
// en todos los módulos del legacy.
const READONLY_SUFFIX = ".ver";

interface Step3PermisosProps {
    form: WizardFormState;
    onChange: (patch: Partial<WizardFormState>) => void;
}

export const Step3Permisos = ({ form, onChange }: Step3PermisosProps) => {
    // ─── Cargar el catálogo de permisos ────────────────────────────────────
    // Endpoint solo accesible por sudo_erp originalmente, pero como cualquier
    // rol con 'usuarios.editar' necesita verlo en el wizard, el backend lo
    // permite a través del decorator del endpoint padre.
    const { data: permisos = [], isLoading, error } = useQuery<PermisoSistema[]>({
        queryKey: queryKeys.erp.permisos(),
        queryFn: getPermisos,
        staleTime: 5 * 60 * 1000, // 5 min — el catálogo es muy estable
    });

    // ─── Agrupar permisos por módulo ───────────────────────────────────────
    // useMemo evita reagrupar en cada render (el step se re-renderiza mucho
    // cuando el usuario marca/desmarca permisos). Solo cambia si la lista
    // de permisos cambia (raro, solo al cargar inicialmente).
    const permisosPorModulo = useMemo(() => {
        const grupos = new Map<string, PermisoSistema[]>();
        for (const p of permisos) {
            const modulo = p.modulo || "otros";
            const lista = grupos.get(modulo) ?? [];
            lista.push(p);
            grupos.set(modulo, lista);
        }

        // Ordenar permisos dentro de cada módulo: primero los .ver, luego
        // los demás alfabéticamente. Así "Ver unidades" siempre arriba
        // como acción base y las acciones más destructivas (borrar,
        // eliminar) quedan más abajo. Heurística #5: ordenar de menos a
        // más riesgoso reduce errores.
        for (const [modulo, lista] of grupos) {
            lista.sort((a, b) => {
                const aIsVer = a.clave.endsWith(READONLY_SUFFIX);
                const bIsVer = b.clave.endsWith(READONLY_SUFFIX);
                if (aIsVer && !bIsVer) return -1;
                if (!aIsVer && bIsVer) return 1;
                return a.nombre.localeCompare(b.nombre, "es");
            });
            grupos.set(modulo, lista);
        }

        return grupos;
    }, [permisos]);

    // ─── Lista ordenada de módulos a renderizar ────────────────────────────
    const modulosOrdenados = useMemo(() => {
        const todos = Array.from(permisosPorModulo.keys());
        const conocidos = MODULE_ORDER.filter((m) => permisosPorModulo.has(m));
        const desconocidos = todos
            .filter((m) => !MODULE_ORDER.includes(m))
            .sort((a, b) => a.localeCompare(b, "es"));
        return [...conocidos, ...desconocidos];
    }, [permisosPorModulo]);

    // ─── Aplicar preset de tipo de acceso ──────────────────────────────────
    // Total       → marca TODOS los id_permiso del catálogo
    // Lectura     → marca solo los que terminan en ".ver"
    // Personalizar → no cambia nada, conserva la selección actual
    const handleTipoAccesoChange = (tipo: TipoAcceso) => {
        const nuevoSet = new Set<number>();

        if (tipo === "total") {
            for (const p of permisos) nuevoSet.add(p.id_permiso);
        } else if (tipo === "lectura") {
            for (const p of permisos) {
                if (p.clave.endsWith(READONLY_SUFFIX)) {
                    nuevoSet.add(p.id_permiso);
                }
            }
        }
        // "personalizar" → mantenemos lo que ya estaba seleccionado.
        // Si vienen de "total" y eligen "personalizar", conservan los 117
        // marcados como punto de partida y desmarcan lo que sobra.

        onChange({
            tipoAcceso: tipo,
            ...(tipo !== "personalizar" && { permisosSeleccionados: nuevoSet }),
        });
    };

    // ─── Handler del cambio de selección desde un acordeón ─────────────────
    // Cuando el usuario toca un acordeón individual, el tipo cambia
    // automáticamente a "personalizar" porque la selección ya no se ajusta
    // a los presets. Esto da feedback visual: el toggle deja de mostrar
    // "Acceso total" y muestra "Personalizar".
    const handleSelectionChange = (newSet: Set<number>) => {
        onChange({
            permisosSeleccionados: newSet,
            tipoAcceso: "personalizar",
        });
    };

    // ─── Estados de carga / error ──────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="py-10 text-center text-sm text-slate-500">
                Cargando catálogo de permisos...
            </div>
        );
    }

    if (error) {
        return (
            <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700"
            >
                No fue posible cargar el catálogo de permisos. Intenta cerrar y reabrir el wizard.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* ── Toggle de tipo de acceso (preset rápido) ─────────────
                Patrón "segmented control" típico de iOS/macOS.
                Inspirado en lo que sugeriste del legacy: "Acceso Total /
                Solo Lectura" + tercera opción "Personalizar". */}
            <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Tipo de acceso</p>
                <div
                    role="group"
                    aria-label="Tipo de acceso del usuario"
                    className="inline-flex gap-1 rounded-lg bg-slate-100 p-1"
                >
                    {(["total", "lectura", "personalizar"] as const).map((tipo) => {
                        const labels: Record<TipoAcceso, string> = {
                            total: "Acceso total",
                            lectura: "Solo lectura",
                            personalizar: "Personalizar",
                        };
                        const isActive = form.tipoAcceso === tipo;
                        return (
                            <button
                                key={tipo}
                                type="button"
                                onClick={() => handleTipoAccesoChange(tipo)}
                                aria-pressed={isActive}
                                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${isActive
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-600 hover:text-slate-800"
                                    }`}
                            >
                                {labels[tipo]}
                            </button>
                        );
                    })}
                </div>

                <p className="mt-2 text-xs text-slate-500">
                    {form.tipoAcceso === "total" &&
                        "Marca todos los permisos del sistema. Equivale a un usuario administrador."}
                    {form.tipoAcceso === "lectura" &&
                        "Solo permite consultar información sin poder crear, editar ni borrar."}
                    {form.tipoAcceso === "personalizar" &&
                        "Marca o desmarca los permisos manualmente según las necesidades del usuario."}
                </p>
            </div>

            {/* ── Lista de acordeones por módulo ─────────────────────── */}
            <div className="flex flex-col gap-2">
                {modulosOrdenados.map((modulo) => {
                    const permisosDelModulo = permisosPorModulo.get(modulo) ?? [];
                    if (permisosDelModulo.length === 0) return null;
                    return (
                        <PermissionAccordion
                            key={modulo}
                            moduleName={modulo}
                            permisos={permisosDelModulo}
                            selected={form.permisosSeleccionados}
                            onChange={handleSelectionChange}
                        />
                    );
                })}
            </div>

            {/* ── Footer con contador global ──────────────────────────
                Visible siempre — feedback constante de cuántos permisos
                tendrá el usuario al final. Heurística #1: visibilidad
                del estado del sistema. */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-600">
                <span className="font-medium text-slate-800">
                    {form.permisosSeleccionados.size}
                </span>{" "}
                de {permisos.length} permisos seleccionados
            </div>
        </div>
    );
};