import type {
  CreateUnitPayload,
  CreateUnitResponse,
  UnitItem,
} from "../types/unit.types"

const API_URL = "http://127.0.0.1:5000"

export const unitService = {
  async getUnits(search = ""): Promise<UnitItem[]> {
  const url = new URL(`${API_URL}/units`)

  if (search.trim()) {
    url.searchParams.set("search", search.trim())
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Error al obtener unidades")
  }

  return data
},

  async createUnit(payload: CreateUnitPayload): Promise<CreateUnitResponse> {
    const response = await fetch(`${API_URL}/units`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Error al crear la unidad")
    }

    return data
  },
}