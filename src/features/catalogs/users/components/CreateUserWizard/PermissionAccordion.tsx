import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PermisoSistema } from "@/features/erp/types/erp.types";

// ─── Acordeón de permisos por módulo ──────────────────────────────────────────
//
// Patrón visual: cada módulo (Catálogos, Operación, etc.) es un panel
// colapsable. El header muestra:
//   - Chevron que rota al expandir
//   - Nombre del módulo
//   - Badge "X / Y" mostrando seleccionados / total
//   - Checkbox padre que marca/desmarca todo el módulo
//
// El cuerpo (cuando está abierto) muestra los permisos individuales en
// grid de 2 columnas (1 columna en mobile).
//
// Patrón estándar tri-state de "select all":
//   - none:    ningún hijo marcado → checkbox padre vacío
//   - some:    algunos marcados   → checkbox padre indeterminate
//   - all:     todos marcados     → checkbox padre marcado
//
// HTML <input type="checkbox"> nativo soporta indeterminate solo via JS
// (no por attribute). Lo aplicamos con ref que se ejecuta en cada render.

interface PermissionAccordionProps {
    moduleName: string;
    permisos: PermisoSistema[];
    // Set compartido con el padre — no copiamos. Mutar el set y notificar
    // al padre con onChange evita re-renders innecesarios cuando hay
    // muchos módulos abiertos.
    selected: Set<number>;
    onChange: (selected: Set<number>) => void;
}

// Mapeo de módulo (slug del backend) a label legible.
// Si llega un módulo no mapeado, se muestra el slug capitalizado como fallback.
const MODULE_LABELS: Record<string, string> = {
    sistema: "Sistema",
    dashboard: "Dashboard",
    mapa: "Mapa",
    unidades: "Unidades",
    clientes: "Clientes",
    terminales: "Terminales",
    operadores: "Operadores",
    pois: "Puntos de Interés",
    gasolineras: "Gasolineras",
    usuarios: "Usuarios",
    rutas: "Rutas",
    itinerarios: "Itinerarios",
    roles_itin: "Roles de itinerario",
    cumplimiento: "Cumplimiento",
    aforos: "Aforos",
    turnos_cliente: "Turnos de cliente",
    semaforos: "Semáforos",
    monitor_sem: "Monitor de semáforos",
    hist_cumplim: "Historial de cumplimiento",
    cargas: "Cargas de combustible",
    tickets: "Tickets de báscula",
    reportes: "Reportes",
};

export const PermissionAccordion = ({
    moduleName,
    permisos,
    selected,
    onChange,
}: PermissionAccordionProps) => {
    // Acordeones empiezan colapsados. Si el usuario eligió "Acceso total"
    // o "Solo lectura" en el toggle, no necesita abrir nada. Solo si elige
    // "Personalizar" probablemente abra los que le interesan.
    const [isOpen, setIsOpen] = useState(false);

    const seleccionadosCount = permisos.filter((p) =>
        selected.has(p.id_permiso),
    ).length;
    const totalCount = permisos.length;

    // Tri-state del checkbox padre
    const allSelected = seleccionadosCount === totalCount && totalCount > 0;
    const someSelected = seleccionadosCount > 0 && seleccionadosCount < totalCount;

    // ─── Toggle del módulo entero ──────────────────────────────────────────
    // Si todo seleccionado → desmarcar todos.
    // Si no → marcar todos.
    // Cubre los 3 estados con UX simple:
    //   none   → click → all
    //   some   → click → all (más útil que none — el usuario ya puso esfuerzo)
    //   all    → click → none
    const toggleModule = () => {
        const newSet = new Set(selected);

        if (allSelected) {
            for (const p of permisos) newSet.delete(p.id_permiso);
        } else {
            for (const p of permisos) newSet.add(p.id_permiso);
        }

        onChange(newSet);
    };

    // ─── Toggle de un permiso individual ───────────────────────────────────
    const toggleOne = (idPermiso: number) => {
        const newSet = new Set(selected);
        if (newSet.has(idPermiso)) {
            newSet.delete(idPermiso);
        } else {
            newSet.add(idPermiso);
        }
        onChange(newSet);
    };

    const moduleLabel = MODULE_LABELS[moduleName] ?? moduleName;

    // ─── Color del badge según selección ───────────────────────────────────
    // Visual rápida del estado:
    //   - 0:        gris (nada seleccionado)
    //   - parcial:  ámbar (advertencia leve, falta algo)
    //   - completo: verde (todo seleccionado)
    const badgeColor = (() => {
        if (seleccionadosCount === 0) return "bg-slate-100 text-slate-500";
        if (someSelected) return "bg-amber-50 text-amber-700";
        return "bg-emerald-50 text-emerald-700";
    })();

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200">
            {/* ── Header del acordeón ──────────────────────────────────
                El header completo es clickable (toggle expand), pero el
                checkbox padre captura su propio click sin propagar.
                Sin stopPropagation el click haría:
                  1. Toggle del checkbox (queremos)
                  2. Toggle del expand (NO queremos) */}
            <div
                onClick={() => setIsOpen((prev) => !prev)}
                className="flex cursor-pointer items-center justify-between bg-slate-50 px-3 py-2.5 transition-colors hover:bg-slate-100"
            >
                <div className="flex items-center gap-2.5">
                    <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"
                            }`}
                        aria-hidden="true"
                    />
                    <span className="text-sm font-medium text-slate-700">{moduleLabel}</span>
                    <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeColor}`}
                    >
                        {seleccionadosCount} / {totalCount}
                    </span>
                </div>

                {/* Checkbox tri-state. Usamos ref para set indeterminate
                    porque no es soportado vía attribute en JSX. La función
                    ref se llama en cada render → se actualiza automáticamente
                    cuando cambia someSelected. */}
                <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleModule}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Seleccionar todos los permisos de ${moduleLabel}`}
                    className="h-4 w-4 cursor-pointer accent-blue-500"
                />
            </div>

            {/* ── Contenido (permisos individuales) ────────────────────
                Solo se renderiza el JSX cuando isOpen=true. Esto evita
                montar 117 checkboxes (uno por permiso) si el usuario
                nunca expande nada. Mejor performance al abrir el modal. */}
            {isOpen && (
                <div className="grid grid-cols-1 gap-1 bg-white px-3 py-2 sm:grid-cols-2">
                    {permisos.map((permiso) => {
                        const isChecked = selected.has(permiso.id_permiso);
                        const inputId = `wiz-perm-${permiso.id_permiso}`;
                        return (
                            <label
                                key={permiso.id_permiso}
                                htmlFor={inputId}
                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                            >
                                <input
                                    id={inputId}
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleOne(permiso.id_permiso)}
                                    className="h-4 w-4 cursor-pointer accent-blue-500"
                                />
                                <span className="select-none text-slate-700">
                                    {permiso.nombre}
                                </span>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
};