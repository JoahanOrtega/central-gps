export interface MapPoiItem {
  id_poi: number
  nombre: string
  direccion: string
  lat: number | null
  lng: number | null
  tipo_poi: number
  radio: number
  polygon_path: string
  radio_color: string
  polygon_color: string
}