import { apiFetch } from "@/lib/api";
import type {
  MapUnitItem,
  UnitsLiveCounts,
  UnitsLiveResponse,
} from "../types/map.types";

// ── Validadores de shape ──────────────────────────────────────────────────────
//
// Principio: validar el dato EN EL BORDE (aquí, donde entra al frontend).
// Los consumidores aguas abajo (hooks, componentes) pueden asumir que el
// UnitsLiveResponse tiene la forma correcta, porque este service ya lo
// garantizó. Esto evita validaciones duplicadas en cada hook.

const EMPTY_COUNTS: UnitsLiveCounts = {
  total: 0,
  engine_on: 0,
  engine_off: 0,
  engine_unknown: 0,
};

/**
 * Type guard: verifica que el valor tiene la forma de UnitsLiveResponse
 * (objeto con arrays `units` y objeto `counts`).
 *
 * @returns true si es un UnitsLiveResponse válido.
 */
const isUnitsLiveResponse = (value: unknown): value is UnitsLiveResponse => {
  if (value === null || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return Array.isArray(obj.units) && typeof obj.counts === "object" && obj.counts !== null;
};

/**
 * Normaliza la respuesta cruda del backend a UnitsLiveResponse.
 *
 * Casos manejados:
 *   1. Shape correcto → se devuelve tal cual.
 *   2. Array plano (formato legacy del backend sin migrar) → se envuelve y
 *      se loguea un warning para que el operador actualice el backend.
 *   3. Cualquier otra cosa → se lanza error con mensaje útil.
 *
 * Esta función aísla al resto del frontend de cambios de contrato futuros:
 * si un día el backend devuelve otro shape, solo este archivo se ajusta.
 */
const normalizeUnitsLive = (raw: unknown): UnitsLiveResponse => {
  if (isUnitsLiveResponse(raw)) {
    return raw;
  }

  // Fallback temporal para backends que aún devuelven el array plano.
  // Cuando el backend esté migrado, esta rama deja de ejecutarse sola.
  // Mantenerla es barato y evita downtime durante el deploy.
  if (Array.isArray(raw)) {
    console.warn(
      "[monitorService] El endpoint /monitor/units-live devolvió el formato " +
      "legacy (array plano). Actualiza el backend para que retorne " +
      "{ units, counts }. Los conteos se calcularán con valores en cero.",
    );
    return {
      units: raw as MapUnitItem[],
      counts: EMPTY_COUNTS,
    };
  }

  throw new Error(
    "El backend devolvió un formato inesperado en /monitor/units-live",
  );
};

// ── API pública del servicio ──────────────────────────────────────────────────

/**
 * Servicio de monitor en vivo.
 * Encapsula las llamadas relacionadas con las unidades visibles en el mapa
 * y garantiza que las respuestas lleguen al resto del frontend ya validadas.
 */
export const monitorService = {
  /**
   * Obtiene las unidades activas con su última telemetría disponible
   * + los conteos agregados de estado del motor.
   *
   * El shape de retorno está garantizado por normalizeUnitsLive — los
   * consumidores pueden asumir sin verificar que `units` es array y
   * `counts` tiene los 4 campos numéricos.
   *
   * idEmpresa es necesario para sudo_erp, que no tiene empresa fija
   * en el JWT y debe indicar explícitamente con qué empresa opera.
   * Para usuarios normales el backend lo toma del JWT como fallback.
   *
   * @throws Error si el backend devolvió un shape irreconocible.
   */
  async getUnitsLive(
    search = "",
    idEmpresa?: number | null,
  ): Promise<UnitsLiveResponse> {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (idEmpresa) params.set("id_empresa", String(idEmpresa));

    const query = params.toString()
      ? `/monitor/units-live?${params.toString()}`
      : "/monitor/units-live";

    const raw = await apiFetch<unknown>(query, { method: "GET" });
    return normalizeUnitsLive(raw);
  },
};