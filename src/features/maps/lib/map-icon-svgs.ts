/**
 * map-icon-svgs.ts — Fábrica de íconos SVG del mapa.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Por qué existe este archivo
 * ═══════════════════════════════════════════════════════════════════════════
 * Antes los markers de eventos usaban <img> apuntando a los SVG heredados del
 * PHP legacy (stop.svg hexagonal, arrow.svg pixelada, etc). Se veían
 * anticuados e inconsistentes entre sí.
 *
 * Este módulo porta el concepto del marker-engine de la v3.0:
 *   1. PALETA CANÓNICA — un solo lugar define los colores de todos los
 *      íconos del recorrido. Cambiar el branding = tocar UNA constante.
 *   2. SVG INLINE — cero requests HTTP, nítidos en pantallas retina,
 *      y el color se inyecta en runtime (no hay un archivo por color).
 *   3. LENGUAJE VISUAL UNIFORME — todos los eventos comparten la misma
 *      base (disco con anillo blanco + sombra suave) para que el usuario
 *      los reconozca como "familia" (Nielsen #4: consistencia y estándares).
 *
 * Todos los glifos usan trazos simples estilo Lucide/Feather para que sean
 * legibles a 26px sobre cualquier fondo de mapa (Ley de Prägnanz: las
 * formas simples se perciben más rápido).
 */

// ═══════════════════════════════════════════════════════════════════════════
// Paleta canónica — única fuente de verdad de colores del recorrido
// ═══════════════════════════════════════════════════════════════════════════

export const ROUTE_ICON_PALETTE = {
    /** Inicio del recorrido — verde "go". */
    start: "#16a34a",
    /** Fin del recorrido — slate oscuro, neutral y formal. */
    finish: "#1e293b",
    /** Flecha de dirección — azul de navegación (familiar por Google/Waze). */
    arrow: "#2563eb",
    /** Parada en relentí — ámbar de "espera", no rojo de "peligro". */
    stop: "#f59e0b",
    /** Motor apagado — gris neutro: estado, no alarma. */
    engine: "#475569",
    /** Exceso de velocidad — rojo de alerta. */
    speed: "#dc2626",
    /** Lectura RFID — azul informativo. */
    rfid: "#3b82f6",
    /** Evento de puerta — violeta distintivo. */
    door: "#7c3aed",
    /** Alerta genérica — ámbar fuerte. */
    alert: "#d97706",
    /** Anillo y glifos — blanco para contraste sobre el disco de color. */
    ring: "#ffffff",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Glifos — el dibujo interno de cada ícono (trazo blanco sobre disco)
// ═══════════════════════════════════════════════════════════════════════════
// Cada glifo se dibuja en un viewBox de 24×24 centrado, con stroke blanco.
// Mantenerlos como funciones puras facilita testearlos y reutilizarlos.

const GLYPHS = {
    /** Pausa ⏸ — convención universal de "detenido" en apps de tracking. */
    stop: `
        <rect x="8.4" y="7.6" width="2.7" height="8.8" rx="1.3"
              fill="${ROUTE_ICON_PALETTE.ring}"/>
        <rect x="12.9" y="7.6" width="2.7" height="8.8" rx="1.3"
              fill="${ROUTE_ICON_PALETTE.ring}"/>`,

    /** Símbolo power ⏻ — línea vertical + arco abierto. */
    engine: `
        <path d="M12 6.5v5" stroke="${ROUTE_ICON_PALETTE.ring}" stroke-width="2.2"
              stroke-linecap="round" fill="none"/>
        <path d="M8.2 8.2a5.4 5.4 0 1 0 7.6 0" stroke="${ROUTE_ICON_PALETTE.ring}"
              stroke-width="2.2" stroke-linecap="round" fill="none"/>`,

    /** Velocímetro — semicírculo con aguja inclinada. */
    speed: `
        <path d="M5.5 15a6.5 6.5 0 0 1 13 0" stroke="${ROUTE_ICON_PALETTE.ring}"
              stroke-width="2.2" stroke-linecap="round" fill="none"/>
        <path d="M12 15 L15.5 10" stroke="${ROUTE_ICON_PALETTE.ring}"
              stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="12" cy="15" r="1.6" fill="${ROUTE_ICON_PALETTE.ring}"/>`,

    /** Tarjeta RFID — tarjeta con banda + ondas contactless en la esquina,
        como el símbolo de las tarjetas bancarias sin contacto. */
    rfid: `
        <rect x="5.2" y="9.2" width="10.6" height="7.6" rx="1.4"
              stroke="${ROUTE_ICON_PALETTE.ring}" stroke-width="1.7" fill="none"/>
        <path d="M5.2 11.8h10.6" stroke="${ROUTE_ICON_PALETTE.ring}"
              stroke-width="1.7"/>
        <path d="M16.2 7.6a3.4 3.4 0 0 1 2.4 2.4" stroke="${ROUTE_ICON_PALETTE.ring}"
              stroke-width="1.6" stroke-linecap="round" fill="none"/>
        <path d="M17.2 5.2a5.8 5.8 0 0 1 3.8 3.8" stroke="${ROUTE_ICON_PALETTE.ring}"
              stroke-width="1.6" stroke-linecap="round" fill="none"/>`,

    /** Puerta de auto — silueta lateral con ventana diagonal y manija. */
    door: `
        <path d="M7 17.5 V12.2 L11.3 6.8 H17 V17.5 Z"
              stroke="${ROUTE_ICON_PALETTE.ring}" stroke-width="1.7"
              fill="none" stroke-linejoin="round"/>
        <path d="M9.4 11.4 L12.2 8.6 H15.2 V11.4 Z"
              fill="${ROUTE_ICON_PALETTE.ring}" opacity="0.9"/>
        <path d="M9.3 14.2h3" stroke="${ROUTE_ICON_PALETTE.ring}"
              stroke-width="1.7" stroke-linecap="round"/>`,

    /** Signo de exclamación para alerta. */
    alert: `
        <path d="M12 7v5.5" stroke="${ROUTE_ICON_PALETTE.ring}" stroke-width="2.4"
              stroke-linecap="round"/>
        <circle cx="12" cy="16.2" r="1.5" fill="${ROUTE_ICON_PALETTE.ring}"/>`,

    /** Triángulo "play" — inicio del recorrido. */
    play: `
        <path d="M9.5 7.5 L17 12 L9.5 16.5 Z" fill="${ROUTE_ICON_PALETTE.ring}"/>`,

    /** Bandera de meta — asta + banderín. */
    flag: `
        <path d="M9 6.5v12" stroke="${ROUTE_ICON_PALETTE.ring}" stroke-width="2"
              stroke-linecap="round"/>
        <path d="M9 7h7l-2 2.75 2 2.75H9z" fill="${ROUTE_ICON_PALETTE.ring}"/>`,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Constructores base
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Disco de color con anillo blanco — base visual de todos los eventos.
 * El anillo blanco separa el ícono del fondo del mapa (misma técnica que
 * el halo `drop-shadow` del marker-engine v3.0, pero como stroke real
 * para que escale sin artefactos).
 */
const discIcon = (fill: string, glyph: string): string => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10.5" fill="${fill}"
            stroke="${ROUTE_ICON_PALETTE.ring}" stroke-width="2"/>
    ${glyph}
</svg>`;

/**
 * Pin tipo gota para inicio/fin — silueta clásica de marcador de mapa.
 * La punta señala la coordenada exacta (precisión > estética).
 */
const pinIcon = (fill: string, glyph: string): string => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34">
    <path d="M12 1C5.9 1 1 5.9 1 12c0 7.6 9.2 19.2 10.3 20.5a0.9 0.9 0 0 0 1.4 0
             C13.8 31.2 23 19.6 23 12 23 5.9 18.1 1 12 1z"
          fill="${fill}" stroke="${ROUTE_ICON_PALETTE.ring}" stroke-width="1.6"/>
    <g transform="translate(0,0.5)">${glyph}</g>
</svg>`;

/**
 * Chevron de navegación — flecha de dirección del recorrido.
 * Triángulo plegado tipo "cursor de navegación", sin disco de fondo:
 * más liviano visualmente porque las flechas aparecen muchas veces por
 * recorrido y no deben competir con los eventos (jerarquía visual).
 * El borde blanco garantiza contraste sobre la polyline y el mapa.
 * Apunta al NORTE en el SVG base; rotar con los grados del AVL directamente
 * (0° = Norte), sin compensaciones mágicas como el -90° del arrow.svg viejo.
 */
const chevronIcon = (): string => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M12 3.5 L18.5 19 L12 15.6 L5.5 19 Z"
          fill="${ROUTE_ICON_PALETTE.arrow}"
          stroke="${ROUTE_ICON_PALETTE.ring}" stroke-width="1.6"
          stroke-linejoin="round"/>
</svg>`;

// ═══════════════════════════════════════════════════════════════════════════
// API pública
// ═══════════════════════════════════════════════════════════════════════════

/** Tipos de ícono disponibles — espejo de RouteEventType + inicio/fin. */
export type RouteIconType =
    | "start"
    | "finish"
    | "arrow"
    | "stop"
    | "engine"
    | "speed"
    | "rfid"
    | "door"
    | "alert"
    | "flags";

/** Markup SVG crudo de cada ícono — para innerHTML de los markers. */
export const getRouteIconSvg = (type: RouteIconType): string => {
    switch (type) {
        case "start":
            return pinIcon(ROUTE_ICON_PALETTE.start, GLYPHS.play);
        case "finish":
            return pinIcon(ROUTE_ICON_PALETTE.finish, GLYPHS.flag);
        case "arrow":
            return chevronIcon();
        case "stop":
            return discIcon(ROUTE_ICON_PALETTE.stop, GLYPHS.stop);
        case "engine":
            return discIcon(ROUTE_ICON_PALETTE.engine, GLYPHS.engine);
        case "speed":
            return discIcon(ROUTE_ICON_PALETTE.speed, GLYPHS.speed);
        case "rfid":
            return discIcon(ROUTE_ICON_PALETTE.rfid, GLYPHS.rfid);
        case "door":
            return discIcon(ROUTE_ICON_PALETTE.door, GLYPHS.door);
        case "alert":
            return discIcon(ROUTE_ICON_PALETTE.alert, GLYPHS.alert);
        case "flags":
            // Versión miniatura del pin de inicio — para botones de UI
            return pinIcon(ROUTE_ICON_PALETTE.start, GLYPHS.flag);
    }
};

/**
 * Data-URI del ícono — para usar como `src` de <img> (botones del
 * TripDrawer, leyendas, etc.) sin archivos en /public.
 */
export const getRouteIconDataUri = (type: RouteIconType): string =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(getRouteIconSvg(type))}`;