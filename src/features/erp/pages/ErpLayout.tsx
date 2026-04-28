// Layout base del panel admin ERP.
//
// Comportamiento responsive:
//   - Desktop (md y arriba): sidebar fijo a la izquierda con 220px de ancho.
//   - Mobile (< md):         drawer deslizante desde la izquierda con
//                            backdrop, accionado por un botón hamburguesa
//                            en la barra superior. Cierra al tocar fuera,
//                            al navegar a otro item o con la tecla Escape.
//
// Refactor del responsive:
//   El componente original usaba estilos inline con dimensiones fijas.
//   Migrado a Tailwind para alinearse con el resto del proyecto y
//   habilitar variantes md: para el comportamiento responsive sin
//   media queries manuales.

import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Building2, ClipboardList, KeyRound, LogOut, Menu, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

// ── Ítems del menú del panel ERP ──────────────────────────
// Se reemplazaron los emojis por íconos de lucide-react para tener
// estilo coherente con el resto del proyecto y mejor accesibilidad
// (los emojis se anuncian de forma inconsistente por los lectores
// de pantalla — los íconos SVG con aria-hidden son más predecibles).
const NAV_ITEMS = [
    { path: "/home/admin-erp/empresas", label: "Empresas", icon: Building2 },
    { path: "/home/admin-erp/permisos", label: "Permisos", icon: KeyRound },
    { path: "/home/admin-erp/auditoria", label: "Auditoría", icon: ClipboardList },
];

export const ErpLayout = () => {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();
    const location = useLocation();

    // Estado del drawer mobile. En desktop esta variable es ignorada
    // porque el sidebar siempre está visible vía clases md:.
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Cerrar el drawer al cambiar de ruta. Sin esto, el usuario navega
    // entre Empresas/Permisos/Auditoría y el drawer queda abierto
    // tapando el contenido al que acaba de saltar.
    useEffect(() => {
        setIsDrawerOpen(false);
    }, [location.pathname]);

    // Cerrar con Escape — Heurística #3 de Nielsen: control y libertad
    // del usuario. Reemplaza la necesidad de tocar la X explícitamente.
    useEffect(() => {
        if (!isDrawerOpen) return;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsDrawerOpen(false);
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [isDrawerOpen]);

    // Bloquear el scroll del body cuando el drawer está abierto.
    // Sin esto, en mobile el usuario puede hacer scroll vertical "detrás"
    // del drawer, lo cual rompe la sensación de modalidad.
    useEffect(() => {
        if (!isDrawerOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, [isDrawerOpen]);

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    // ─────────────────────────────────────────────────────────────────────
    // Helper: contenido del sidebar.
    // Se define una sola vez y se reutiliza en desktop (sidebar fijo)
    // y mobile (drawer). DRY: si cambian los items o el footer, no hay
    // que mantener dos copias.
    // ─────────────────────────────────────────────────────────────────────
    const sidebarContent = (
        <>
            {/* ── Cabecera del sidebar ── */}
            <div className="border-b border-slate-800 px-5 pb-6">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                    Panel Admin
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                    CentralGPS ERP
                </p>
            </div>

            {/* ── Navegación ── */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                isActive
                                    ? "bg-blue-700 font-medium text-white"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                            )
                        }
                    >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* ── Usuario + logout ── */}
            <div className="border-t border-slate-800 px-5 py-4">
                <p className="truncate text-xs text-slate-300">
                    {user?.nombre || user?.username}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                    Administrador ERP
                </p>
                <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800"
                >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    Cerrar sesión
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen flex-col font-sans md:flex-row">

            {/* ─── Topbar mobile ──────────────────────────────────────────
                Solo visible en mobile. Contiene el botón hamburguesa y el
                título corto del panel para que el usuario sepa dónde está
                aunque el sidebar esté oculto.
                Heurística #1 de Nielsen: visibilidad del estado del sistema. */}
            <header className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 md:hidden">
                <button
                    type="button"
                    onClick={() => setIsDrawerOpen(true)}
                    aria-label="Abrir menú del panel ERP"
                    aria-expanded={isDrawerOpen}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-slate-300 hover:bg-slate-800"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <p className="text-sm font-semibold text-slate-100">
                    CentralGPS ERP
                </p>
                {/* Espaciador invisible para que el título quede centrado
                    visualmente respecto al botón. Sin esto, el título se
                    pega al lado izquierdo y se ve desbalanceado. */}
                <div className="h-9 w-9" aria-hidden="true" />
            </header>

            {/* ─── Sidebar desktop (siempre visible md:flex) ──────────────
                Mismo contenido que el drawer mobile. El "hidden md:flex"
                de Tailwind controla visibilidad por breakpoint. */}
            <aside className="hidden w-[220px] shrink-0 flex-col bg-slate-900 py-6 text-slate-200 md:flex">
                {sidebarContent}
            </aside>

            {/* ─── Drawer mobile ──────────────────────────────────────────
                Solo se renderiza el JSX cuando isDrawerOpen es true.
                Esto evita que la animación se dispare al cargar la página
                (sin esto, el drawer haría una animación de "salida" en el
                primer render, visible como un flash a la izquierda). */}
            {isDrawerOpen && (
                <>
                    {/* Backdrop. fixed para cubrir TODA la pantalla
                        independientemente del scroll del contenido. */}
                    <div
                        className="fixed inset-0 z-40 bg-black/50 md:hidden"
                        onClick={() => setIsDrawerOpen(false)}
                        aria-hidden="true"
                    />

                    {/* Panel deslizante. role="dialog" + aria-modal lo
                        marcan como modal accesible para lectores de pantalla. */}
                    <aside
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menú del panel ERP"
                        className="fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col bg-slate-900 py-6 text-slate-200 shadow-xl md:hidden"
                    >
                        {/* Botón cerrar dentro del drawer.
                            Posicionado absoluto para no empujar el contenido. */}
                        <button
                            type="button"
                            onClick={() => setIsDrawerOpen(false)}
                            aria-label="Cerrar menú"
                            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        {sidebarContent}
                    </aside>
                </>
            )}

            {/* ── Contenido principal ── */}
            <main className="flex-1 overflow-auto bg-slate-50 p-4 md:p-8">
                <Outlet />
            </main>
        </div>
    );
};