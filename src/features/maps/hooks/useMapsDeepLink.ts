/**
 * useMapsDeepLink.ts — Deep-link ?unidad=<id> en el módulo de mapas.
 *
 * ¿Por qué existe este hook?
 * ──────────────────────────
 * Cuando el usuario hace click en una notificación de la campanita o en
 * una unidad del dashboard, React Router navega a "/home/maps?unidad=42".
 * Sin este hook, el mapa carga normalmente y el parámetro se ignora.
 *
 * ¿Qué hace?
 * ──────────
 *   1. Lee `?unidad=` de la URL al montar.
 *   2. Espera a que useUnitsLive haya cargado las unidades (puede tardar
 *      un tick si el polling aún no completó).
 *   3. Busca la unidad por ID entre las unidades cargadas.
 *   4. Si la encuentra:
 *      a. La selecciona en el store (activa su checkbox, queda visible en el mapa).
 *      b. Llama a `focusUnit` para centrar el mapa y abrir el InfoWindow.
 *      c. Abre el UnitsDrawer para que el usuario pueda contextualizarla.
 *   5. Limpia el parámetro de la URL (replace) para que el "atrás" del
 *      navegador no repita el foco innecesariamente.
 *
 * ¿Por qué esperar a units.length > 0 con useEffect?
 * ─────────────────────────────────────────────────────
 * useUnitsLive hace fetch asíncrono. Al montar MapsView, units=[] durante
 * el primer render. Si intentáramos buscar la unidad en ese momento, no la
 * encontraríamos. El efecto se re-ejecuta cada vez que cambia `units`,
 * así que en el segundo render (datos ya cargados) puede proceder.
 * Un ref `procesadoRef` garantiza que el foco solo ocurre una vez por
 * navegación, aunque el polling refresque units varias veces.
 *
 * Uso (en MapsView):
 *   useMapsDeepLink({
 *     units,
 *     mapCanvasRef,
 *     setSelectedIds,
 *     onOpenUnitsDrawer,
 *   });
 */

import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import type { RefObject } from "react";

import type { MapUnitItem } from "../types/map.types";
import type { MapCanvasHandle } from "../components/MapCanvas";
import { useUnitsDrawerStore } from "../stores/unitsDrawerStore";

interface UseMapsDeepLinkParams {
    /** Lista actual de unidades cargada por useUnitsLive. */
    units: MapUnitItem[];
    /** Ref al canvas del mapa para llamar focusUnit. */
    mapCanvasRef: RefObject<MapCanvasHandle | null>;
    /** Callback para abrir el drawer de unidades. */
    onOpenUnitsDrawer: () => void;
}

export const useMapsDeepLink = ({
    units,
    mapCanvasRef,
    onOpenUnitsDrawer,
}: UseMapsDeepLinkParams): void => {
    const [searchParams, setSearchParams] = useSearchParams();
    const setSelectedIds = useUnitsDrawerStore((s) => s.setSelectedIds);

    // Guard: garantiza que el foco ocurra una sola vez por montaje,
    // aunque el polling actualice `units` múltiples veces.
    const procesadoRef = useRef(false);

    useEffect(() => {
        // Si ya procesamos el deep-link en este montaje, no repetir.
        if (procesadoRef.current) return;

        // Leer el parámetro antes de que las unidades carguen para
        // detectar si hay intención de deep-link en esta navegación.
        const idParam = searchParams.get("unidad");
        if (!idParam) return;

        const idBuscado = Number(idParam);
        // Validar que el parámetro sea un número positivo real.
        if (!Number.isInteger(idBuscado) || idBuscado <= 0) {
            // Parámetro inválido — limpiar sin hacer nada.
            setSearchParams({}, { replace: true });
            return;
        }

        // Esperar a que useUnitsLive haya cargado al menos una unidad.
        // Si units aún está vacío, este efecto volverá a correr cuando cargue.
        if (units.length === 0) return;

        const unidad = units.find((u) => u.id === idBuscado);

        if (!unidad) {
            // La unidad no existe en esta empresa o no tiene permisos — limpiar URL.
            setSearchParams({}, { replace: true });
            procesadoRef.current = true;
            return;
        }

        // Marcar como procesado ANTES de los efectos secundarios para evitar
        // doble ejecución si el render se interrumpe (React Strict Mode).
        procesadoRef.current = true;

        // 1. Seleccionar la unidad en el drawer (activa su checkbox).
        //    Pasamos un array con solo esta unidad para no pisar selecciones previas
        //    en caso de que el usuario ya tuviera otras unidades marcadas.
        setSelectedIds([idBuscado]);

        // 2. Abrir el drawer de unidades para dar contexto visual.
        onOpenUnitsDrawer();

        // 3. Centrar el mapa y abrir el InfoWindow.
        //    requestAnimationFrame da tiempo al mapa de procesar showUnits antes
        //    de que se ejecute focusUnit (que necesita que el marker ya exista).
        requestAnimationFrame(() => {
            mapCanvasRef.current?.focusUnit(unidad);
        });

        // 4. Limpiar el parámetro de la URL para que el botón "atrás"
        //    no repita el foco al volver a esta ruta.
        setSearchParams({}, { replace: true });

    // Se re-ejecuta cuando llegan las unidades (puede ser vacío en el primer render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [units]);
};