import type { UnitItem } from "../types/unit.types"

const API_URL = "http://127.0.0.1:5000"

export const unitService = {
  async getUnits(): Promise<UnitItem[]> {
    const response = await fetch(`${API_URL}/units`, {
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
}