// Checklist de onboarding flotante al estilo Notion/Intercom.
//
// Lo que hace Notion, Intercom y Shopify:
//   - Checklist flotante esquina inferior derecha — NO bloquea el uso.
//   - 3-5 pasos máximo (Hick's Law: más opciones = más tiempo de decision).
//   - Progreso visible: "2 de 3 completados" — endowed progress effect
//     (LinkedIn profile bar). El usuario siente que YA avanzó y quiere terminar.
//   - Puede cerrarse: Nielsen #3 (control del usuario). El usuario no se siente
//     atrapado — lo que paradójicamente aumenta la tasa de completado.
//   - Reaparece hasta que se completan todos los pasos o se descarta
//     explícitamente (no vuelve a aparecer si el usuario lo cierra con X).
//
// Para CentralGPS el flujo crítico es:
//   1. Ver el mapa (saber dónde están las unidades)
//   2. Crear un POI (definir un lugar de interés)
//   3. Configurar una alerta (activar el sistema de geocercas)
//
// Sin estos 3 pasos el sistema no hace nada útil — 84% de usuarios
// abandonan si ven dashboard vacío sin guía contextual (Hotjar research).
//
// Estado persistido en localStorage por empresa+usuario para que:
//   - No reaparezca si el usuario ya completó el onboarding.
//   - No reaparezca si el usuario lo descartó explícitamente.
//   - Sí reaparezca si el usuario cambia de empresa (nuevo contexto).

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { useAuthStore } from "@/stores/authStore";

// ── Pasos del onboarding ──────────────────────────────────────────────────────
// Máximo 5 pasos — Hick's Law. Cada paso lleva al usuario a una acción
// concreta, no a una pantalla de información pasiva.
interface OnboardingStep {
    id: string;
    titulo: string;
    descripcion: string;
    accion: string;   // texto del botón CTA
    ruta: string;   // ruta a la que navega el CTA
}

const PASOS: OnboardingStep[] = [
    {
        id: "ver_mapa",
        titulo: "Explora el mapa en tiempo real",
        descripcion: "Ve dónde están tus unidades ahora mismo.",
        accion: "Ir al mapa",
        ruta: "/home/maps",
    },
    {
        id: "crear_poi",
        titulo: "Crea tu primer Punto de Interés",
        descripcion: "Define ubicaciones clave: bodegas, clientes, rutas.",
        accion: "Crear POI",
        ruta: "/home/catalogs/points-of-interest",
    },
    {
        id: "configurar_alerta",
        titulo: "Configura una alerta de geocerca",
        descripcion: "Recibe notificaciones cuando una unidad entre o salga de un POI.",
        accion: "Configurar alerta",
        ruta: "/home/catalogs/points-of-interest",
    },
];

// ── Helpers de persistencia ───────────────────────────────────────────────────
const buildStorageKey = (idEmpresa: number | null | undefined, idUsuario: string | null) =>
    `cgps_onboarding_${idEmpresa ?? "x"}_${idUsuario ?? "x"}`;

interface OnboardingState {
    completados: string[];   // IDs de pasos completados
    descartado: boolean;    // true si el usuario cerró con X
}

const leerEstado = (key: string): OnboardingState => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return { completados: [], descartado: false };
        return JSON.parse(raw) as OnboardingState;
    } catch {
        return { completados: [], descartado: false };
    }
};

const guardarEstado = (key: string, estado: OnboardingState) => {
    try {
        localStorage.setItem(key, JSON.stringify(estado));
    } catch {
        // localStorage puede estar bloqueado en modo privado — ignorar
    }
};

// ── Componente ────────────────────────────────────────────────────────────────
export const OnboardingChecklist = () => {
    const navigate = useNavigate();
    const { idEmpresa } = useEmpresaActiva();
    const user = useAuthStore(s => s.user);
    const idUsuario = user?.sub ?? null;

    const storageKey = buildStorageKey(idEmpresa, idUsuario);

    const [estado, setEstado] = useState<OnboardingState>(() => leerEstado(storageKey));
    const [expandido, setExpandido] = useState(true);

    // Sincronizar con localStorage cuando el estado cambia
    useEffect(() => {
        guardarEstado(storageKey, estado);
    }, [estado, storageKey]);

    // Re-leer cuando cambia la empresa o el usuario
    useEffect(() => {
        setEstado(leerEstado(storageKey));
        setExpandido(true);
    }, [storageKey]);

    const completados = estado.completados;
    const totalCompletados = completados.length;
    const totalPasos = PASOS.length;
    const todoCompleto = totalCompletados >= totalPasos;
    const progreso = Math.round((totalCompletados / totalPasos) * 100);

    // No mostrar si: descartado, todo completo, o empresa no definida
    if (estado.descartado || todoCompleto || !idEmpresa) return null;

    const handleCompletar = (id: string) => {
        if (!completados.includes(id)) {
            setEstado(prev => ({
                ...prev,
                completados: [...prev.completados, id],
            }));
        }
    };

    const handleDescartar = () => {
        setEstado(prev => ({ ...prev, descartado: true }));
    };

    const handleCTA = (paso: OnboardingStep) => {
        handleCompletar(paso.id);
        navigate(paso.ruta);
    };

    return (
        <div className="fixed bottom-6 right-6 z-40 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-200" />
                    <span className="text-sm font-semibold text-white">
                        Primeros pasos
                    </span>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
                        {totalCompletados}/{totalPasos}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setExpandido(p => !p)}
                        className="rounded-lg p-1 text-blue-200 hover:bg-white/10 hover:text-white"
                        aria-label={expandido ? "Colapsar" : "Expandir"}
                    >
                        {expandido ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={handleDescartar}
                        className="rounded-lg p-1 text-blue-200 hover:bg-white/10 hover:text-white"
                        aria-label="Cerrar guía de inicio"
                        title="No volver a mostrar"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* ── Barra de progreso ─────────────────────────────────────────── */}
            {/* Siempre visible aunque esté colapsado — el usuario ve su avance
                sin necesidad de expandir. Efecto Zeigarnik: recordamos tareas
                incompletas y sentimos impulso de terminarlas. */}
            <div className="h-1 w-full bg-slate-100">
                <div
                    className="h-1 bg-blue-500 transition-all duration-500"
                    style={{ width: `${progreso}%` }}
                />
            </div>

            {/* ── Pasos (expandible) ────────────────────────────────────────── */}
            {expandido && (
                <div className="divide-y divide-slate-100 p-2">
                    {PASOS.map((paso) => {
                        const completado = completados.includes(paso.id);
                        return (
                            <div
                                key={paso.id}
                                className={`flex items-start gap-3 rounded-xl p-3 transition-colors ${completado ? "opacity-50" : "hover:bg-slate-50"
                                    }`}
                            >
                                {/* Ícono de estado */}
                                <div className="mt-0.5 shrink-0">
                                    {completado ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    ) : (
                                        <Circle className="h-5 w-5 text-slate-300" />
                                    )}
                                </div>

                                {/* Contenido del paso */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium leading-snug ${completado ? "line-through text-slate-400" : "text-slate-700"
                                        }`}>
                                        {paso.titulo}
                                    </p>
                                    {!completado && (
                                        <>
                                            <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
                                                {paso.descripcion}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => handleCTA(paso)}
                                                className="mt-2 rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                                            >
                                                {paso.accion} →
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};