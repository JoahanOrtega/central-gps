import { useEffect } from "react";

// Sufijo consistente en todas las páginas — cambiarlo aquí
// lo actualiza en toda la app sin tocar cada página.
const APP_NAME = "CentralGPS";

// ── Hook para actualizar el <title> del documento ─────────────
// Uso:
//   useDocumentTitle("Mapa");        → "Mapa — CentralGPS"
//   useDocumentTitle("Unidades");    → "Unidades — CentralGPS"
//
// Al desmontar el componente restaura el título base de la app
// para evitar que títulos de páginas anteriores persistan si
// el router reutiliza el componente sin re-montarlo.
export const useDocumentTitle = (pageTitle: string): void => {
    useEffect(() => {
        document.title = `${APP_NAME} | ${pageTitle} `;

        return () => {
            document.title = APP_NAME;
        };
    }, [pageTitle]);
};