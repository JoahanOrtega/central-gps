import type { MapPoiItem } from "../types/map.types";
import type { PoiItem } from "@/features/catalogs/pois/types/poi.types";

/**
 * Convierte el modelo de POI del catálogo al modelo consumido por el mapa.
 */
export const toMapPoiItem = (poi: PoiItem): MapPoiItem => ({
  id_poi: poi.id_poi,
  nombre: poi.nombre ?? "",
  direccion: poi.direccion ?? "",
  lat: poi.lat ?? null,
  lng: poi.lng ?? null,
  tipo_poi: poi.tipo_poi ?? 1,
  radio: poi.radio ?? 50,
  polygon_path: poi.polygon_path ?? "",
  radio_color: poi.radio_color ?? "#5e6383",
  polygon_color: poi.polygon_color ?? "#5e6383",
  tipo_marker: poi.tipo_marker ?? null,
  url_marker: poi.url_marker ?? null,
  marker_path: poi.marker_path ?? null,
  marker_color: poi.marker_color ?? null,
  icon: poi.icon ?? null,
  icon_color: poi.icon_color ?? null,
  observaciones: poi.observaciones ?? null,
});