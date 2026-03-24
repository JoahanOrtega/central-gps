import type {
  PoiItem,
  PoiGroupItem,
  CreatePoiPayload,
  CreatePoiGroupPayload,
} from "../types/poi.types"

const API_URL = "http://127.0.0.1:5000"

export const poiService = {
  async getPois(search = ""): Promise<PoiItem[]> {
    const url = new URL(`${API_URL}/pois`)

    if (search.trim()) {
      url.searchParams.set("search", search.trim())
    }

    const response = await fetch(url.toString())
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Error al obtener los puntos de interés")
    }

    return data
  },

  async createPoi(payload: CreatePoiPayload) {
    const response = await fetch(`${API_URL}/pois`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Error al guardar el punto de interés")
    }

    return data
  },

  async getPoiGroups(search = ""): Promise<PoiGroupItem[]> {
    const url = new URL(`${API_URL}/poi-groups`)

    if (search.trim()) {
      url.searchParams.set("search", search.trim())
    }

    const response = await fetch(url.toString())
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Error al obtener grupos de POIs")
    }

    return data
  },

  async createPoiGroup(payload: CreatePoiGroupPayload) {
    const response = await fetch(`${API_URL}/poi-groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Error al guardar grupo de POIs")
    }

    return data
  },

  async getClients() {
    const response = await fetch(`${API_URL}/clients`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Error al obtener clientes")
    }

    return data
  },
}