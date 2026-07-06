import { useCallback, useEffect, useRef } from "react";
import type { Route } from "@/features/operation/routes/types/route.types";

interface CatalogRouteLayer {
  polylines: google.maps.Polyline[];
  markers: google.maps.Marker[];
  points: google.maps.LatLngLiteral[];
}

interface UseMapCatalogRoutesParams {
  mapRef: React.RefObject<google.maps.Map | null>;
}

export interface UseMapCatalogRoutesReturn {
  showCatalogRoute: (route: Route) => void;
  hideCatalogRoute: (idRuta: number) => void;
  clearCatalogRoutes: () => void;
}

export const useMapCatalogRoutes = ({
  mapRef,
}: UseMapCatalogRoutesParams): UseMapCatalogRoutesReturn => {
  const layersRef = useRef<Map<number, CatalogRouteLayer>>(new Map());

  const fitCatalogRoutes = useCallback(() => {
    const map = mapRef.current;
    if (!map || layersRef.current.size === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    layersRef.current.forEach((layer) => {
      layer.points.forEach((point) => bounds.extend(point));
    });

    if (!bounds.isEmpty()) map.fitBounds(bounds);
  }, [mapRef]);

  const hideCatalogRoute = useCallback(
    (idRuta: number) => {
      const layer = layersRef.current.get(idRuta);
      if (!layer) return;

      layer.polylines.forEach((polyline) => polyline.setMap(null));
      layer.markers.forEach((marker) => marker.setMap(null));
      layersRef.current.delete(idRuta);
      fitCatalogRoutes();
    },
    [fitCatalogRoutes],
  );

  const showCatalogRoute = useCallback(
    (route: Route) => {
      const map = mapRef.current;
      const idRuta = route.id_ruta;
      if (!map || idRuta == null) return;

      const previousLayer = layersRef.current.get(idRuta);
      previousLayer?.polylines.forEach((polyline) => polyline.setMap(null));
      previousLayer?.markers.forEach((marker) => marker.setMap(null));

      const layer: CatalogRouteLayer = {
        polylines: [],
        markers: [],
        points: [],
      };

      route.logisticas.forEach((logistica) => {
        if (logistica.path.length > 0) {
          layer.polylines.push(
            new window.google.maps.Polyline({
              map,
              path: logistica.path,
              geodesic: true,
              strokeColor: logistica.trace_color ?? "#2563eb",
              strokeOpacity: 0.9,
              strokeWeight: 4,
            }),
          );
          layer.points.push(...logistica.path);
        }

        logistica.paradas.forEach((parada) => {
          if (parada.latitud === 0 && parada.longitud === 0) return;

          const position = {
            lat: parada.latitud,
            lng: parada.longitud,
          };

          layer.markers.push(
            new window.google.maps.Marker({
              map,
              position,
              title: parada.nombre,
              label: {
                text: String(parada.numero),
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: "bold",
              },
            }),
          );
          layer.points.push(position);
        });
      });

      layersRef.current.set(idRuta, layer);
      fitCatalogRoutes();
    },
    [fitCatalogRoutes, mapRef],
  );

  const clearCatalogRoutes = useCallback(() => {
    layersRef.current.forEach((layer) => {
      layer.polylines.forEach((polyline) => polyline.setMap(null));
      layer.markers.forEach((marker) => marker.setMap(null));
    });
    layersRef.current.clear();
  }, []);

  useEffect(() => clearCatalogRoutes, [clearCatalogRoutes]);

  return {
    showCatalogRoute,
    hideCatalogRoute,
    clearCatalogRoutes,
  };
};
