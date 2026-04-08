import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { loadGoogleMaps } from "@/lib/loadGoogleMaps";
import type { MapPoiItem, MapUnitItem, RoutePoint } from "../types/map.types";
import {
  getTelemetryStatusColor,
  getTelemetryStatusLabel,
} from "../lib/telemetry-status";

type RouteArrowMarkerData = {
  point: RoutePoint;
  index: number;
  heading: number;
  distanceFromStartKm: number;
};

const DEFAULT_CENTER = { lat: 23.6345, lng: -102.5528 };
const DEFAULT_ZOOM = 5;
const USER_LOCATION_ZOOM = 16;

/* =========================
   Helpers matemáticos
   ========================= */

/** Convierte grados a radianes. */
const toRadians = (value: number) => (value * Math.PI) / 180;
/** Convierte radianes a grados. */
const toDegrees = (value: number) => (value * 180) / Math.PI;

/**
 * Calcula el rumbo entre dos puntos geográficos.
 * Se usa para orientar las flechas del recorrido.
 */
const getHeadingBetweenPoints = (
  start: google.maps.LatLngLiteral,
  end: google.maps.LatLngLiteral,
) => {
  const lat1 = toRadians(start.lat);
  const lng1 = toRadians(start.lng);
  const lat2 = toRadians(end.lat);
  const lng2 = toRadians(end.lng);

  const dLng = lng2 - lng1;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const heading = toDegrees(Math.atan2(y, x));
  return (heading + 360) % 360;
};

/** Calcula distancia entre dos puntos en kilómetros. */
const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

/* =========================
   Helpers de texto / HTML
   ========================= */

/** Escapa texto para colocarlo de forma segura dentro del InfoWindow. */
const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export interface MapCanvasHandle {
  focusMexico: () => void;
  toggleTraffic: () => void;
  clearMap: () => void;
  searchAddress: (address: string) => Promise<void>;
  toggleFullscreen: () => void;

  focusPoi: (poi: MapPoiItem) => void;
  showPois: (pois: MapPoiItem[]) => void;
  hidePois: () => void;

  focusUnit: (unit: MapUnitItem) => void;
  showUnits: (units: MapUnitItem[]) => void;
  hideUnits: () => void;

  showUnitRoute: (points: RoutePoint[], unitLabel?: string) => void;
  hideUnitRoute: () => void;
  setRouteVisible: (visible: boolean) => void;
  setRouteStartEndVisible: (visible: boolean) => void;
  setRouteDirectionVisible: (visible: boolean) => void;
}

/**
 * Componente que encapsula la integración con Google Maps.
 * Expone una API imperativa para que MapsView controle:
 * - búsqueda
 * - tráfico
 * - POIs
 * - unidades
 * - recorridos
 */
export const MapCanvas = forwardRef<MapCanvasHandle>((_, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const searchMarkerRef =
    useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const poiMarkersRef = useRef<
    Map<number, google.maps.marker.AdvancedMarkerElement>
  >(new Map());
  const poiCirclesRef = useRef<Map<number, google.maps.Circle>>(new Map());
  const poiPolygonsRef = useRef<Map<number, google.maps.Polygon>>(new Map());

  const unitMarkersRef = useRef<
    Map<number, google.maps.marker.AdvancedMarkerElement>
  >(new Map());

  const unitRoutePolylineRef = useRef<google.maps.Polyline | null>(null);
  const routeStartMarkerRef =
    useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const routeEndMarkerRef =
    useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const routeDirectionMarkersRef = useRef<
    google.maps.marker.AdvancedMarkerElement[]
  >([]);

  const currentRoutePointsRef = useRef<RoutePoint[]>([]);
  const currentRouteUnitLabelRef = useRef<string | null>(null);

  const routeVisibleRef = useRef(true);
  const routeStartEndVisibleRef = useRef(true);
  const routeDirectionVisibleRef = useRef(false);

  const [isTrafficVisible, setIsTrafficVisible] = useState(false);

  /* =========================
     Inicialización del mapa
     ========================= */

  /**
   * Intenta obtener la ubicación actual del navegador.
   * Si falla, el mapa usa el centro de México por defecto.
   */
  const getBrowserLocation = () =>
    new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("La geolocalización no está disponible"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000,
        },
      );
    });

  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      await loadGoogleMaps();

      if (!containerRef.current || !window.google?.maps || !isMounted) return;

      let initialCenter = DEFAULT_CENTER;
      let initialZoom = DEFAULT_ZOOM;
      let hasUserLocation = false;

      try {
        const userLocation = await getBrowserLocation();
        initialCenter = userLocation;
        initialZoom = USER_LOCATION_ZOOM;
        hasUserLocation = true;
      } catch {
        initialCenter = DEFAULT_CENTER;
        initialZoom = DEFAULT_ZOOM;
      }

      if (!isMounted) return;

      const map = new window.google.maps.Map(containerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        gestureHandling: "greedy",
        zoomControl: true,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
        },
        mapTypeId: "roadmap",
        mapId: "DEMO_MAP_ID",
      });

      mapRef.current = map;
      geocoderRef.current = new window.google.maps.Geocoder();
      trafficLayerRef.current = new window.google.maps.TrafficLayer();
      infoWindowRef.current = new window.google.maps.InfoWindow();

      if (hasUserLocation) {
        const userMarkerContent = document.createElement("div");
        userMarkerContent.style.width = "18px";
        userMarkerContent.style.height = "18px";
        userMarkerContent.style.borderRadius = "9999px";
        userMarkerContent.style.background = "#2563eb";
        userMarkerContent.style.border = "3px solid white";
        userMarkerContent.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";

        new window.google.maps.marker.AdvancedMarkerElement({
          map,
          position: initialCenter,
          title: "Mi ubicación",
          content: userMarkerContent,
        });
      }
    };

    void initializeMap();

    return () => {
      isMounted = false;
    };
  }, []);

  /* =========================
     Builders de markers / popups
     ========================= */

  const buildSearchMarkerContent = () => {
    const element = document.createElement("div");
    element.style.width = "18px";
    element.style.height = "18px";
    element.style.borderRadius = "9999px";
    element.style.background = "#2563eb";
    element.style.border = "3px solid white";
    element.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
    return element;
  };

  const buildPoiMarkerContent = () => {
    const element = document.createElement("div");
    element.style.width = "18px";
    element.style.height = "18px";
    element.style.borderRadius = "9999px";
    element.style.background = "#f97316";
    element.style.border = "3px solid white";
    element.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
    return element;
  };

  const buildUnitMarkerContent = (unit: MapUnitItem) => {
    const color = getTelemetryStatusColor(
      unit.telemetry?.status,
      unit.telemetry?.velocidad,
    );

    const element = document.createElement("div");
    element.style.width = "22px";
    element.style.height = "22px";
    element.style.borderRadius = "9999px";
    element.style.background = color;
    element.style.border = "3px solid white";
    element.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
    element.style.cursor = "pointer";

    return element;
  };

  const createRouteFlagMarker = (
    map: google.maps.Map,
    position: google.maps.LatLngLiteral,
    label: string,
    color: string,
  ) => {
    const element = document.createElement("div");
    element.style.display = "flex";
    element.style.alignItems = "center";
    element.style.justifyContent = "center";
    element.style.width = "28px";
    element.style.height = "28px";
    element.style.borderRadius = "9999px";
    element.style.background = color;
    element.style.color = "white";
    element.style.fontSize = "12px";
    element.style.fontWeight = "700";
    element.style.border = "2px solid white";
    element.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
    element.innerText = label;

    return new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      content: element,
    });
  };

  const buildPoiInfoWindowContent = (poi: MapPoiItem) => `
    <div style="min-width:220px; padding:4px 2px;">
      <div style="font-weight:600; font-size:14px; color:#334155;">
        ${escapeHtml(poi.nombre || "Sin nombre")}
      </div>
      <div style="margin-top:6px; font-size:12px; color:#64748b; line-height:1.4;">
        ${escapeHtml(poi.direccion || "Sin dirección")}
      </div>
    </div>
  `;

  const buildUnitInfoWindowContent = (unit: MapUnitItem) => {
    const telemetry = unit.telemetry;
    const statusLabel = getTelemetryStatusLabel(
      telemetry?.status,
      telemetry?.velocidad,
    );

    return `
      <div style="min-width:220px; padding:4px 2px;">
        <div style="font-weight:600; font-size:14px; color:#334155;">
          ${escapeHtml(unit.numero || "Sin nombre")}
        </div>
        <div style="margin-top:6px; font-size:12px; color:#64748b; line-height:1.4;">
          Estado: ${escapeHtml(statusLabel)}
        </div>
        <div style="font-size:12px; color:#64748b; line-height:1.4;">
          Velocidad: ${telemetry?.velocidad ?? 0} km/h
        </div>
        <div style="font-size:12px; color:#64748b; line-height:1.4;">
          Fecha: ${escapeHtml(telemetry?.fecha_hora_gps || "Sin fecha")}
        </div>
      </div>
    `;
  };

  const buildRouteArrowInfoWindowContent = (
    unitLabel: string | null,
    data: RouteArrowMarkerData,
  ) => {
    const speed = data.point.velocidad ?? 0;
    const status = data.point.status || "Sin estado";
    const movementState = data.point.movement_state || "Sin clasificación";

    return `
      <div style="min-width:220px; padding:4px 2px;">
        <div style="font-weight:600; font-size:14px; color:#334155;">
          ${escapeHtml(unitLabel || "Unidad")}
        </div>

        <div style="margin-top:6px; font-size:12px; color:#16a34a; font-weight:600;">
          Registro del recorrido
        </div>

        <div style="margin-top:4px; font-size:12px; color:#475569; line-height:1.45;">
          Punto #${data.index + 1}
        </div>

        <div style="font-size:12px; color:#475569; line-height:1.45;">
          Velocidad: ${speed} km/h
        </div>

        <div style="font-size:12px; color:#475569; line-height:1.45;">
          Estado: ${escapeHtml(status)}
        </div>

        <div style="font-size:12px; color:#475569; line-height:1.45;">
          Tipo: ${escapeHtml(movementState)}
        </div>

        <div style="font-size:12px; color:#475569; line-height:1.45;">
          Distancia desde el inicio: ${data.distanceFromStartKm.toFixed(2)} km
        </div>

        <div style="font-size:12px; color:#475569; line-height:1.45;">
          ${escapeHtml(data.point.fecha_hora_gps)}
        </div>
      </div>
    `;
  };

  /* =========================
     Helpers de POI
     ========================= */

  const parsePolygonPath = (polygonPath: string) => {
    try {
      const parsed = JSON.parse(polygonPath);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  /* =========================
     Limpieza de elementos del mapa
     ========================= */

  const clearSearchMarker = () => {
    if (searchMarkerRef.current) {
      searchMarkerRef.current.map = null;
      searchMarkerRef.current = null;
    }
  };

  const clearPoisMarkers = () => {
    poiMarkersRef.current.forEach((marker) => {
      marker.map = null;
    });
    poiMarkersRef.current.clear();
  };

  const clearPoiGeometry = () => {
    poiCirclesRef.current.forEach((circle) => circle.setMap(null));
    poiCirclesRef.current.clear();

    poiPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
    poiPolygonsRef.current.clear();
  };

  const clearUnitMarkers = () => {
    unitMarkersRef.current.forEach((marker) => {
      marker.map = null;
    });
    unitMarkersRef.current.clear();
  };

  const clearRouteStartEndMarkers = () => {
    if (routeStartMarkerRef.current) {
      routeStartMarkerRef.current.map = null;
      routeStartMarkerRef.current = null;
    }

    if (routeEndMarkerRef.current) {
      routeEndMarkerRef.current.map = null;
      routeEndMarkerRef.current = null;
    }
  };

  const clearRouteDirectionMarkers = () => {
    routeDirectionMarkersRef.current.forEach((marker) => {
      marker.map = null;
    });
    routeDirectionMarkersRef.current = [];
  };

  /* =========================
     Gestión de rutas
     ========================= */

  /**
   * Elimina por completo la ruta y sus overlays asociados.
   */
  const hideUnitRoute = () => {
    if (unitRoutePolylineRef.current) {
      unitRoutePolylineRef.current.setMap(null);
      unitRoutePolylineRef.current = null;
    }

    currentRoutePointsRef.current = [];
    currentRouteUnitLabelRef.current = null;
    clearRouteStartEndMarkers();
    clearRouteDirectionMarkers();

    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  };

  /**
   * Calcula la distancia acumulada hasta un índice del recorrido.
   * Se usa para el popup de cada flecha.
   */
  const calculateDistanceFromStart = (points: RoutePoint[], index: number) => {
    let distanceKm = 0;

    for (let i = 1; i <= index; i += 1) {
      const previous = points[i - 1];
      const current = points[i];

      distanceKm += haversineKm(
        previous.latitud,
        previous.longitud,
        current.latitud,
        current.longitud,
      );
    }

    return Number(distanceKm.toFixed(2));
  };

  /**
   * Dibuja una flecha por cada registro del recorrido.
   * Cada flecha es clickeable y muestra información del punto.
   */
  const drawRouteDirectionMarkers = (points: RoutePoint[]) => {
    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;

    if (!map || !infoWindow || points.length === 0) return;

    clearRouteDirectionMarkers();

    points.forEach((point, index) => {
      let heading = 0;

      if (points.length === 1) {
        heading = point.grados ?? 0;
      } else if (index < points.length - 1) {
        const nextPoint = points[index + 1];
        heading = getHeadingBetweenPoints(
          { lat: point.latitud, lng: point.longitud },
          { lat: nextPoint.latitud, lng: nextPoint.longitud },
        );
      } else {
        const previousPoint = points[index - 1];
        heading = getHeadingBetweenPoints(
          { lat: previousPoint.latitud, lng: previousPoint.longitud },
          { lat: point.latitud, lng: point.longitud },
        );
      }

      const element = document.createElement("div");
      element.style.width = "18px";
      element.style.height = "18px";
      element.style.display = "flex";
      element.style.alignItems = "center";
      element.style.justifyContent = "center";
      element.style.transform = `rotate(${heading}deg)`;
      element.style.fontSize = "14px";
      element.style.fontWeight = "700";
      element.style.lineHeight = "1";
      element.style.cursor = "pointer";
      element.style.textShadow = "0 0 2px white";

      const movementState = point.movement_state || "desconocido";

      if (movementState === "movimiento") {
        element.style.color = "#16a34a";
      } else if (movementState === "stop") {
        element.style.color = "#6b7280";
      } else if (movementState === "apagado") {
        element.style.color = "#dc2626";
      } else {
        element.style.color = "#374151";
      }

      element.innerHTML = "⮝";

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position: {
          lat: point.latitud,
          lng: point.longitud,
        },
        content: element,
        title: `Registro ${index + 1}`,
        zIndex: 10,
      });

      marker.addListener("click", () => {
        infoWindow.setContent(
          buildRouteArrowInfoWindowContent(currentRouteUnitLabelRef.current, {
            point,
            index,
            heading,
            distanceFromStartKm: calculateDistanceFromStart(points, index),
          }),
        );

        infoWindow.open({
          map,
          anchor: marker,
        });
      });

      routeDirectionMarkersRef.current.push(marker);
    });
  };

  /**
   * Dibuja los markers de inicio y fin del recorrido.
   */
  const drawRouteStartEndMarkers = (points: RoutePoint[]) => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;

    clearRouteStartEndMarkers();

    const first = points[0];
    const last = points[points.length - 1];

    routeStartMarkerRef.current = createRouteFlagMarker(
      map,
      { lat: first.latitud, lng: first.longitud },
      "I",
      "#16a34a",
    );

    routeEndMarkerRef.current = createRouteFlagMarker(
      map,
      { lat: last.latitud, lng: last.longitud },
      "F",
      "#6b7280",
    );
  };

  /**
   * Sincroniza la visibilidad de la ruta y sus overlays auxiliares.
   */
  const syncRouteOverlays = () => {
    const map = mapRef.current;
    const points = currentRoutePointsRef.current;

    if (unitRoutePolylineRef.current) {
      unitRoutePolylineRef.current.setMap(routeVisibleRef.current ? map : null);
    }

    clearRouteStartEndMarkers();
    clearRouteDirectionMarkers();

    if (!routeVisibleRef.current || !map || points.length === 0) {
      return;
    }

    if (routeStartEndVisibleRef.current) {
      drawRouteStartEndMarkers(points);
    }

    if (routeDirectionVisibleRef.current) {
      drawRouteDirectionMarkers(points);
    }
  };

  /* =========================
     Gestión general de mapa
     ========================= */

  const clearMap = () => {
    clearSearchMarker();
    clearPoisMarkers();
    clearPoiGeometry();
    clearUnitMarkers();
    hideUnitRoute();

    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  };

  /**
   * Dibuja un POI tipo círculo o polígono.
   */
  const drawSinglePoiGeometry = (poi: MapPoiItem) => {
    const map = mapRef.current;
    if (!map) return;
    if (poi.lat === null || poi.lng === null) return;

    if (poi.tipo_poi === 1) {
      const existingCircle = poiCirclesRef.current.get(poi.id_poi);
      if (existingCircle) {
        existingCircle.setMap(null);
        poiCirclesRef.current.delete(poi.id_poi);
      }

      const circle = new window.google.maps.Circle({
        map,
        center: { lat: poi.lat, lng: poi.lng },
        radius: poi.radio || 50,
        fillColor: poi.radio_color || "#5e6383",
        fillOpacity: 0.2,
        strokeColor: poi.radio_color || "#5e6383",
        strokeOpacity: 0.9,
        strokeWeight: 2,
      });

      poiCirclesRef.current.set(poi.id_poi, circle);
      return;
    }

    if (poi.tipo_poi === 2) {
      const points = parsePolygonPath(poi.polygon_path);
      if (points.length < 3) return;

      const existingPolygon = poiPolygonsRef.current.get(poi.id_poi);
      if (existingPolygon) {
        existingPolygon.setMap(null);
        poiPolygonsRef.current.delete(poi.id_poi);
      }

      const polygon = new window.google.maps.Polygon({
        map,
        paths: points,
        fillColor: poi.polygon_color || "#5e6383",
        fillOpacity: 0.2,
        strokeColor: poi.polygon_color || "#5e6383",
        strokeOpacity: 0.9,
        strokeWeight: 2,
      });

      poiPolygonsRef.current.set(poi.id_poi, polygon);
    }
  };

  const drawPoisGeometries = (pois: MapPoiItem[]) => {
    clearPoiGeometry();
    pois.forEach(drawSinglePoiGeometry);
  };

  /* =========================
     Acciones públicas del mapa
     ========================= */

  const focusMexico = () => {
    const map = mapRef.current;
    if (!map) return;

    map.panTo(DEFAULT_CENTER);
    map.setZoom(DEFAULT_ZOOM);
  };

  const toggleTraffic = () => {
    const map = mapRef.current;
    const trafficLayer = trafficLayerRef.current;

    if (!map || !trafficLayer) return;

    if (isTrafficVisible) {
      trafficLayer.setMap(null);
      setIsTrafficVisible(false);
      return;
    }

    trafficLayer.setMap(map);
    setIsTrafficVisible(true);
  };

  const searchAddress = async (address: string) => {
    const map = mapRef.current;
    const geocoder = geocoderRef.current;

    if (!map || !geocoder || !address.trim()) return;

    const result = await new Promise<google.maps.GeocoderResult | null>(
      (resolve) => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === "OK" && results && results.length > 0) {
            resolve(results[0]);
            return;
          }

          resolve(null);
        });
      },
    );

    if (!result?.geometry.location) return;

    const location = result.geometry.location;

    map.panTo(location);
    map.setZoom(16);

    if (!searchMarkerRef.current) {
      searchMarkerRef.current =
        new window.google.maps.marker.AdvancedMarkerElement({
          map,
          position: location,
          title: result.formatted_address,
          content: buildSearchMarkerContent(),
        });
      return;
    }

    searchMarkerRef.current.position = location;
    searchMarkerRef.current.map = map;
  };

  const focusPoi = (poi: MapPoiItem) => {
    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;

    if (!map || !infoWindow) return;
    if (poi.lat === null || poi.lng === null) return;

    const position = { lat: poi.lat, lng: poi.lng };

    map.panTo(position);
    map.setZoom(17);

    const existingMarker = poiMarkersRef.current.get(poi.id_poi);

    if (existingMarker) {
      infoWindow.setContent(buildPoiInfoWindowContent(poi));
      infoWindow.open({ map, anchor: existingMarker });
      return;
    }

    const marker = new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      title: poi.nombre,
      content: buildPoiMarkerContent(),
    });

    marker.addListener("click", () => {
      infoWindow.setContent(buildPoiInfoWindowContent(poi));
      infoWindow.open({ map, anchor: marker });
    });

    poiMarkersRef.current.set(poi.id_poi, marker);

    infoWindow.setContent(buildPoiInfoWindowContent(poi));
    infoWindow.open({ map, anchor: marker });
  };

  const showPois = (pois: MapPoiItem[]) => {
    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;

    if (!map || !infoWindow) return;

    clearPoisMarkers();
    clearPoiGeometry();

    const bounds = new window.google.maps.LatLngBounds();
    let hasValidPoints = false;

    pois.forEach((poi) => {
      if (poi.lat === null || poi.lng === null) return;

      const position = { lat: poi.lat, lng: poi.lng };

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title: poi.nombre,
        content: buildPoiMarkerContent(),
      });

      marker.addListener("click", () => {
        infoWindow.setContent(buildPoiInfoWindowContent(poi));
        infoWindow.open({ map, anchor: marker });
      });

      poiMarkersRef.current.set(poi.id_poi, marker);
      bounds.extend(position);
      hasValidPoints = true;
    });

    drawPoisGeometries(pois);

    if (hasValidPoints) {
      map.fitBounds(bounds);
      const zoom = map.getZoom();
      if (typeof zoom === "number" && zoom > 17) {
        map.setZoom(17);
      }
    }
  };

  const hidePois = () => {
    clearPoisMarkers();
    clearPoiGeometry();
    infoWindowRef.current?.close();
  };

  const focusUnit = (unit: MapUnitItem) => {
    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;

    if (!map || !infoWindow) return;
    if (unit.telemetry?.latitud == null || unit.telemetry?.longitud == null)
      return;

    const position = {
      lat: unit.telemetry.latitud,
      lng: unit.telemetry.longitud,
    };

    map.panTo(position);
    map.setZoom(17);

    const existingMarker = unitMarkersRef.current.get(unit.id);

    if (existingMarker) {
      infoWindow.setContent(buildUnitInfoWindowContent(unit));
      infoWindow.open({ map, anchor: existingMarker });
      return;
    }

    const marker = new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      title: unit.numero,
      content: buildUnitMarkerContent(unit),
    });

    marker.addListener("click", () => {
      infoWindow.setContent(buildUnitInfoWindowContent(unit));
      infoWindow.open({ map, anchor: marker });
    });

    unitMarkersRef.current.set(unit.id, marker);

    infoWindow.setContent(buildUnitInfoWindowContent(unit));
    infoWindow.open({ map, anchor: marker });
  };

  const showUnits = (units: MapUnitItem[]) => {
    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;

    if (!map || !infoWindow) return;

    clearUnitMarkers();

    const bounds = new window.google.maps.LatLngBounds();
    let hasValidPoints = false;

    units.forEach((unit) => {
      if (unit.telemetry?.latitud == null || unit.telemetry?.longitud == null)
        return;

      const position = {
        lat: unit.telemetry.latitud,
        lng: unit.telemetry.longitud,
      };

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title: unit.numero,
        content: buildUnitMarkerContent(unit),
      });

      marker.addListener("click", () => {
        infoWindow.setContent(buildUnitInfoWindowContent(unit));
        infoWindow.open({ map, anchor: marker });
      });

      unitMarkersRef.current.set(unit.id, marker);
      bounds.extend(position);
      hasValidPoints = true;
    });

    if (hasValidPoints) {
      map.fitBounds(bounds);
      const zoom = map.getZoom();
      if (typeof zoom === "number" && zoom > 17) {
        map.setZoom(17);
      }
    }
  };

  const hideUnits = () => {
    clearUnitMarkers();
    infoWindowRef.current?.close();
  };

  const showUnitRoute = (points: RoutePoint[], unitLabel?: string) => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;

    hideUnitRoute();

    currentRoutePointsRef.current = points;
    currentRouteUnitLabelRef.current = unitLabel ?? null;

    const path = points.map((point) => ({
      lat: point.latitud,
      lng: point.longitud,
    }));

    unitRoutePolylineRef.current = new window.google.maps.Polyline({
      path,
      strokeColor: "#22c55e",
      strokeOpacity: 1,
      strokeWeight: 4,
      geodesic: false,
      map: routeVisibleRef.current ? map : null,
    });

    const bounds = new window.google.maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds);

    syncRouteOverlays();
  };

  const toggleFullscreen = () => {
    const element = containerRef.current;
    if (!element) return;

    if (!document.fullscreenElement) {
      void element.requestFullscreen();
      return;
    }

    void document.exitFullscreen();
  };

  useImperativeHandle(ref, () => ({
    focusMexico,
    toggleTraffic,
    clearMap,
    searchAddress,
    toggleFullscreen,

    focusPoi,
    showPois,
    hidePois,

    focusUnit,
    showUnits,
    hideUnits,

    showUnitRoute,
    hideUnitRoute,

    setRouteVisible: (visible: boolean) => {
      routeVisibleRef.current = visible;
      syncRouteOverlays();
    },

    setRouteStartEndVisible: (visible: boolean) => {
      routeStartEndVisibleRef.current = visible;
      syncRouteOverlays();
    },

    setRouteDirectionVisible: (visible: boolean) => {
      routeDirectionVisibleRef.current = visible;
      syncRouteOverlays();
    },
  }));

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      <div className="absolute right-4 top-2 z-[1] flex flex-col gap-3">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          title="Pantalla completa"
          onClick={toggleFullscreen}
        >
          ⛶
        </button>
      </div>

      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
});

MapCanvas.displayName = "MapCanvas";