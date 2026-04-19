import { useRef } from "react";
import type { RoutePoint, RouteDisplayOptions } from "../types/map.types";
import {
    createRouteFlagMarker,
    buildRouteArrowMarkerContent,
    buildRouteEventMarkerContent,
    type RouteEventType,
} from "../lib/map-markers";
import {
    buildRouteArrowInfoWindowContent,
    buildStartFlagContent,
    buildEndFlagContent,
    buildStopEventContent,
    buildEngineEventContent,
    buildDoorEventContent,
    buildSpeedEventContent,
} from "../lib/map-html-builders";
import { haversineKm } from "../lib/map-geometry";
import { formatDuration, formatCalendar } from "@/lib/date-time";

// ── Interfaz pública ──────────────────────────────────────────────────────────
export interface UseMapRouteReturn {
    showUnitRoute: (points: RoutePoint[], unitLabel?: string, velMax?: number) => void;
    hideUnitRoute: () => void;
    setLayerVisible: (layer: keyof RouteDisplayOptions, visible: boolean) => void;
    setAllLayersVisible: (options: RouteDisplayOptions) => void;
    getActiveRouteSummary: () => ActiveRouteSummary | null;
    // Aliases para compatibilidad con MapsView existente
    setRouteVisible: (visible: boolean) => void;
    setRouteStartEndVisible: (visible: boolean) => void;
    setRouteDirectionVisible: (visible: boolean) => void;
}

export interface ActiveRouteSummary {
    unitLabel: string | null;
    velMax: number;
    points: RoutePoint[];
    distanceKm: number;
    movingSeconds: number;
    idleSeconds: number;
    offSeconds: number;
    speedingCount: number;
    startDate: string;
    endDate: string;
}

interface UseMapRouteParams {
    mapRef: React.RefObject<google.maps.Map | null>;
    infoWindowRef: React.RefObject<google.maps.InfoWindow | null>;
}

// ── Umbrales de flechas (fiel al draw.js legacy) ──────────────────────────────
// Giro >= 20° → flecha cada 100 m | Recto → flecha cada 2 000 m
const ARROW_DIST_CURVE = 0.1;  // km
const ARROW_DIST_STRAIGHT = 2.0;  // km

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useMapRoute = ({
    mapRef,
    infoWindowRef,
}: UseMapRouteParams): UseMapRouteReturn => {

    // ── Refs de capas dibujadas ───────────────────────────────────────────────
    // Usamos arrays mutables (no refs de array) para poder reasignarlos
    const polylinesRef = useRef<google.maps.Polyline[]>([]);
    const flagMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const arrowMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const allArrowMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const stopMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const speedMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const engineMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const doorMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const rfidMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const alertMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

    const activePointsRef = useRef<RoutePoint[]>([]);
    const activeUnitLabelRef = useRef<string | null>(null);
    const activeVelMaxRef = useRef<number>(0);
    const activeSummaryRef = useRef<ActiveRouteSummary | null>(null);

    const visibilityRef = useRef<RouteDisplayOptions>({
        flags: true, arrows: false, stops: true,
        speeding: true, engine: true, rfid: true, alerts: true, doors: true,
    });

    // ── Helpers de limpieza ───────────────────────────────────────────────────
    // Se evita reasignar ref.current directamente (readonly en tipos estrictos).
    // En su lugar vaciamos el array en el lugar con splice() y ponemos map=null.
    const clearMarkers = (arr: google.maps.marker.AdvancedMarkerElement[]) => {
        arr.forEach((m) => { m.map = null; });
        arr.splice(0);
    };

    const clearAllRoute = () => {
        polylinesRef.current.forEach((p) => p.setMap(null));
        polylinesRef.current.splice(0);

        clearMarkers(flagMarkersRef.current);
        clearMarkers(arrowMarkersRef.current);
        clearMarkers(allArrowMarkersRef.current);
        clearMarkers(stopMarkersRef.current);
        clearMarkers(speedMarkersRef.current);
        clearMarkers(engineMarkersRef.current);
        clearMarkers(doorMarkersRef.current);
        clearMarkers(rfidMarkersRef.current);
        clearMarkers(alertMarkersRef.current);

        infoWindowRef.current?.close();
        activePointsRef.current = [];
        activeUnitLabelRef.current = null;
        activeSummaryRef.current = null;
    };

    // ── Aplicar visibilidad ───────────────────────────────────────────────────
    const applyVisibility = (opt: RouteDisplayOptions) => {
        const map = mapRef.current;

        const toggle = (
            arr: google.maps.marker.AdvancedMarkerElement[],
            on: boolean,
        ) => arr.forEach((m) => { m.map = on ? map : null; });

        toggle(flagMarkersRef.current, opt.flags);
        toggle(stopMarkersRef.current, opt.stops);
        toggle(speedMarkersRef.current, opt.speeding);
        toggle(engineMarkersRef.current, opt.engine);
        toggle(doorMarkersRef.current, opt.doors);
        toggle(rfidMarkersRef.current, opt.rfid);
        toggle(alertMarkersRef.current, opt.alerts);
        toggle(arrowMarkersRef.current, opt.arrows);
        toggle(allArrowMarkersRef.current, opt.arrows);
        // El polyline siempre visible cuando hay recorrido
        polylinesRef.current.forEach((p) => p.setMap(map));
    };

    // ── Resumen ───────────────────────────────────────────────────────────────
    const buildSummary = (
        points: RoutePoint[],
        unitLabel: string | null,
        velMax: number,
    ): ActiveRouteSummary => {
        let distanceKm = 0, movingSeconds = 0, idleSeconds = 0;
        let offSeconds = 0, speedingCount = 0;

        const OFF = "000000000";
        const ON = "100000000";

        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const dt = Math.max(0, Math.floor(
                (new Date(curr.fecha_hora_gps).getTime() -
                    new Date(prev.fecha_hora_gps).getTime()) / 1000,
            ));
            const status = (prev.status ?? "").trim();
            const speed = prev.velocidad ?? 0;

            distanceKm += haversineKm(prev.latitud, prev.longitud, curr.latitud, curr.longitud);

            if (status === OFF) { offSeconds += dt; continue; }
            if (speed >= 1) { movingSeconds += dt; }
            else { idleSeconds += dt; }
            if (velMax > 0 && Math.round(speed) >= velMax) speedingCount++;
        }

        return {
            unitLabel, velMax, points,
            distanceKm: Number(distanceKm.toFixed(2)),
            movingSeconds: Math.round(movingSeconds),
            idleSeconds: Math.round(idleSeconds),
            offSeconds: Math.round(offSeconds),
            speedingCount,
            startDate: points[0].fecha_hora_gps,
            endDate: points[points.length - 1].fecha_hora_gps,
        };
    };

    // ── Polylines multicolor ──────────────────────────────────────────────────
    const drawPolylines = (points: RoutePoint[], velMax: number) => {
        const map = mapRef.current!;
        if (points.length < 2) return;

        const getColor = (p: RoutePoint) => {
            if (p.strokeColor) return p.strokeColor;
            const s = p.velocidad ?? 0;
            if (velMax > 0 && Math.round(s) >= velMax) return "#ea1f25";
            if (velMax > 0 && Math.round(s) >= velMax - 5) return "#ff9800";
            return "#4caf50";
        };

        let color = getColor(points[0]);
        let path: google.maps.LatLngLiteral[] = [
            { lat: points[0].latitud, lng: points[0].longitud },
        ];

        const flush = (extra?: RoutePoint) => {
            if (path.length < 2) return;
            if (extra) path.push({ lat: extra.latitud, lng: extra.longitud });
            polylinesRef.current.push(
                new window.google.maps.Polyline({
                    path, strokeColor: color,
                    strokeOpacity: 0.85, strokeWeight: 4,
                    geodesic: true, map,
                }),
            );
        };

        for (let i = 1; i < points.length; i++) {
            const c = getColor(points[i]);
            if (c !== color) {
                flush(points[i]);
                color = c;
                path = [
                    { lat: points[i - 1].latitud, lng: points[i - 1].longitud },
                    { lat: points[i].latitud, lng: points[i].longitud },
                ];
            } else {
                path.push({ lat: points[i].latitud, lng: points[i].longitud });
            }
        }
        flush();
    };

    // ── Banderas inicio / fin ─────────────────────────────────────────────────
    const drawFlags = (points: RoutePoint[]) => {
        const map = mapRef.current!;
        if (points.length < 2) return;

        const first = points[0];
        const last = points[points.length - 1];

        let totalKm = 0;
        for (let i = 1; i < points.length; i++)
            totalKm += haversineKm(
                points[i - 1].latitud, points[i - 1].longitud,
                points[i].latitud, points[i].longitud,
            );

        const dur = formatDuration(Math.max(0, Math.floor(
            (new Date(last.fecha_hora_gps).getTime() -
                new Date(first.fecha_hora_gps).getTime()) / 1000,
        )));

        const startM = createRouteFlagMarker(map, { lat: first.latitud, lng: first.longitud }, "I", "#16a34a");
        const endM = createRouteFlagMarker(map, { lat: last.latitud, lng: last.longitud }, "F", "#374151");

        startM.addListener("click", () => {
            infoWindowRef.current?.setContent(buildStartFlagContent(formatCalendar(first.fecha_hora_gps)));
            infoWindowRef.current?.open({ map, anchor: startM });
        });
        endM.addListener("click", () => {
            infoWindowRef.current?.setContent(buildEndFlagContent(Number(totalKm.toFixed(2)), dur));
            infoWindowRef.current?.open({ map, anchor: endM });
        });

        flagMarkersRef.current.push(startM, endM);
        if (!visibilityRef.current.flags) {
            startM.map = null;
            endM.map = null;
        }
    };

    // ── Flechas de dirección ──────────────────────────────────────────────────
    // Usa el campo `grados` del AVL directamente — fiel al draw.js legacy
    const drawArrows = (points: RoutePoint[], velMax: number) => {
        const map = mapRef.current!;
        const infoWindow = infoWindowRef.current!;
        const unitLabel = activeUnitLabelRef.current;
        const visible = visibilityRef.current.arrows;

        let lastDistKm = 0;
        let lastGrados = 0;
        let cumDistKm = 0;

        for (let i = 0; i < points.length - 1; i++) {
            const p = points[i];
            const next = points[i + 1];

            // Solo puntos con movimiento real
            if ((p.status ?? "").charAt(0) !== "1") continue;
            if ((p.velocidad ?? 0) < 1) continue;
            if ((p.grados ?? 0) === 0) continue;

            cumDistKm += haversineKm(p.latitud, p.longitud, next.latitud, next.longitud);

            const distFromLast = cumDistKm - lastDistKm;
            const angleDiff = Math.abs(lastGrados - (p.grados ?? 0));
            const threshold = angleDiff >= 20 ? ARROW_DIST_CURVE : ARROW_DIST_STRAIGHT;
            const isMain = distFromLast >= threshold || lastDistKm === 0;

            const marker = new window.google.maps.marker.AdvancedMarkerElement({
                map: visible ? map : null,
                position: { lat: p.latitud, lng: p.longitud },
                content: buildRouteArrowMarkerContent(p.grados ?? 0),
                zIndex: 10,
            });

            const distFromStart = Number(cumDistKm.toFixed(2));
            marker.addListener("click", () => {
                infoWindow.setContent(
                    buildRouteArrowInfoWindowContent(unitLabel, {
                        point: p, index: i,
                        heading: p.grados ?? 0,
                        distanceFromStartKm: distFromStart,
                    }),
                );
                infoWindow.open({ map, anchor: marker });
            });

            if (isMain) {
                arrowMarkersRef.current.push(marker);
                lastDistKm = cumDistKm;
                lastGrados = p.grados ?? 0;
            } else {
                allArrowMarkersRef.current.push(marker);
            }
        }
    };

    // ── Eventos del recorrido ─────────────────────────────────────────────────
    // Detección por status + velocidad (igual que draw.js legacy).
    // `door` se detecta por el bit 2 del campo status: SUBSTR(status,2,1)='1'
    // cuando input1=3 (sensor de puerta). Como RoutePoint no incluye la config
    // de la unidad, usamos movement_state="stop" para paradas y el status bit
    // para apagado/encendido. La puerta requeriría datos del input que no vienen
    // en el recorrido — se omite sin error de tipo.
    const drawEvents = (points: RoutePoint[], velMax: number) => {
        const map = mapRef.current!;
        const infoWindow = infoWindowRef.current!;
        const vis = visibilityRef.current;
        const OFF = "000000000";
        const ON = "100000000";

        type State = "none" | "stop" | "engine" | "speed";
        let state: State = "none";
        let eventStart = 0;
        let velMaxAcc = 0;
        let eventDist = 0;
        let cumKm = 0;

        const mkMarker = (
            type: RouteEventType,
            lat: number, lng: number,
            html: string,
            on: boolean,
            velMaxima?: number,
        ) => {
            const m = new window.google.maps.marker.AdvancedMarkerElement({
                map: on ? map : null,
                position: { lat, lng },
                content: buildRouteEventMarkerContent(type, velMaxima),
                zIndex: 20,
            });
            m.addListener("click", () => {
                infoWindow.setContent(html);
                infoWindow.open({ map, anchor: m });
            });
            return m;
        };

        const closeState = (endIdx: number) => {
            if (state === "none") return;
            const s = points[eventStart];
            const e = points[endIdx];
            if (!s || !e) return;

            const dur = formatDuration(Math.max(0, Math.floor(
                (new Date(e.fecha_hora_gps).getTime() -
                    new Date(s.fecha_hora_gps).getTime()) / 1000,
            )));
            const periodo = `${formatCalendar(s.fecha_hora_gps)} – ${formatCalendar(e.fecha_hora_gps)}`;

            if (state === "stop") {
                stopMarkersRef.current.push(
                    mkMarker("stop", s.latitud, s.longitud, buildStopEventContent(dur, periodo), vis.stops),
                );
            }
            if (state === "engine") {
                engineMarkersRef.current.push(
                    mkMarker("engine", s.latitud, s.longitud, buildEngineEventContent(dur, periodo), vis.engine),
                );
            }
            if (state === "speed") {
                speedMarkersRef.current.push(
                    mkMarker("speed", s.latitud, s.longitud,
                        buildSpeedEventContent(velMaxAcc, velMax, eventDist, dur, periodo),
                        vis.speeding, velMaxAcc,
                    ),
                );
                velMaxAcc = 0;
                eventDist = 0;
            }
        };

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const status = (p.status ?? "").trim();
            const speed = p.velocidad ?? 0;

            if (i > 0) {
                cumKm += haversineKm(
                    points[i - 1].latitud, points[i - 1].longitud,
                    p.latitud, p.longitud,
                );
            }

            // ── Motor apagado ─────────────────────────────────────────────────
            if (status === OFF && state === "none") {
                state = "engine"; eventStart = i;
            } else if (state === "engine" && status !== OFF) {
                closeState(i); state = "none";
            }

            // ── Parada (relentí) ──────────────────────────────────────────────
            if (status === ON && speed < 1 && state === "none") {
                state = "stop"; eventStart = i;
            } else if (state === "stop" && !(status === ON && speed < 1)) {
                closeState(i); state = "none";
            }

            // ── Exceso de velocidad ───────────────────────────────────────────
            if (velMax > 0 && Math.round(speed) >= velMax && state === "none") {
                state = "speed"; eventStart = i; velMaxAcc = Math.round(speed); eventDist = 0;
            } else if (state === "speed") {
                if (Math.round(speed) > velMaxAcc) velMaxAcc = Math.round(speed);
                if (i > 0) eventDist += haversineKm(
                    points[i - 1].latitud, points[i - 1].longitud,
                    p.latitud, p.longitud,
                );
                if (Math.round(speed) < velMax) { closeState(i); state = "none"; }
            }
        }

        if (state !== "none") closeState(points.length - 1);
    };

    // ── Acción principal ──────────────────────────────────────────────────────
    const showUnitRoute = (
        points: RoutePoint[],
        unitLabel = "",
        velMax = 0,
    ) => {
        const map = mapRef.current;
        if (!map || points.length < 2) return;

        clearAllRoute();

        activePointsRef.current = points;
        activeUnitLabelRef.current = unitLabel || null;
        activeVelMaxRef.current = velMax;
        activeSummaryRef.current = buildSummary(points, unitLabel || null, velMax);

        drawPolylines(points, velMax);
        drawFlags(points);
        drawArrows(points, velMax);
        drawEvents(points, velMax);

        applyVisibility(visibilityRef.current);

        const bounds = new window.google.maps.LatLngBounds();
        points.forEach((p) => bounds.extend({ lat: p.latitud, lng: p.longitud }));
        map.fitBounds(bounds);
    };

    const hideUnitRoute = () => clearAllRoute();

    const setLayerVisible = (layer: keyof RouteDisplayOptions, visible: boolean) => {
        visibilityRef.current = { ...visibilityRef.current, [layer]: visible };
        applyVisibility(visibilityRef.current);
    };

    const setAllLayersVisible = (options: RouteDisplayOptions) => {
        visibilityRef.current = options;
        applyVisibility(options);
    };

    const getActiveRouteSummary = () => activeSummaryRef.current;

    // Aliases para MapsView existente
    const setRouteVisible = (v: boolean) => setLayerVisible("flags", v);
    const setRouteStartEndVisible = (v: boolean) => setLayerVisible("flags", v);
    const setRouteDirectionVisible = (v: boolean) => setLayerVisible("arrows", v);

    return {
        showUnitRoute, hideUnitRoute,
        setLayerVisible, setAllLayersVisible,
        getActiveRouteSummary,
        setRouteVisible, setRouteStartEndVisible, setRouteDirectionVisible,
    };
};