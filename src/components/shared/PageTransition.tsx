// Wrapper de transición de página con fade-in + slide-up sutil.
//
// Lo que hacen Linear, Notion y Stripe:
//   - NO usan transiciones elaboradas entre páginas — eso ralentiza
//     la percepción de navegación.
//   - Usan fade-in de 150-200ms con ligero translateY(8px → 0).
//   - ease-out: empieza rápido, termina suave — se percibe como respuesta
//     inmediata al click. ease-in se percibe como lento aunque dure igual.
//   - El contenido *entra desde abajo 8px*, no desde fuera de pantalla.
//     Ese desplazamiento mínimo da profundidad sin distraer.
//
// Implementación con CSS puro (sin Framer Motion):
//   - Más performante: usa GPU compositor con opacity + transform.
//   - Sin dependencias extra: la app ya carga rápido, no añadimos bundle.
//   - @media prefers-reduced-motion: respeta la configuración de
//     accesibilidad del SO. Usuarios con vestibular disorders agradecen esto.
//
// Uso:
//   Envuelve el <Outlet /> en HomeLayout.
//   El key={location.pathname} fuerza el remount en cada navegación,
//   disparando la animación de entrada cada vez.

import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";

interface PageTransitionProps {
    children: ReactNode;
}

export const PageTransition = ({ children }: PageTransitionProps) => {
    const location = useLocation();

    return (
        <div
            // key fuerza remount en cada cambio de ruta → dispara la animación
            key={location.pathname}
            className="page-transition h-full"
        >
            {children}
        </div>
    );
};