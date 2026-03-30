import { apiFetch } from '@/lib/api'
import type { MapUnitItem } from '../components/maps/map.types'

export const monitorService = {
  getUnitsLive(search = ''): Promise<MapUnitItem[]> {
    const query = search.trim()
      ? `/monitor/units-live?search=${encodeURIComponent(search.trim())}`
      : '/monitor/units-live'

    return apiFetch<MapUnitItem[]>(query, {
      method: 'GET',
    })
  },
}