import { apiFetch, apiUpload } from "@/lib/api";
import type {
  CreateUnitPayload,
  CreateUnitResponse,
  UnitItem,
} from "../types/unit.types";
import type {
  UnitDetail,
  UpdateUnitPayload,
  UpdateUnitResponse,
} from "../types/unit-edit.types";
import type {
  UnitTokenConfig,
  RegenerateUnitTokenResponse,
} from "../types/unit-token.types";


// ── Tipo de respuesta del DELETE ─────────────────────────────────────────────
// El backend retorna {message, eliminado, id_unidad} con 200 OK.
// Lo definimos inline (no en types/) porque solo lo usa este service —
// si en el futuro otro consumidor lo necesita, se promueve a types/.
interface DeleteUnitResponse {
  message: string;
  eliminado: boolean;
  id_unidad: number;
}

export const unitService = {
  getUnits(
    search = "",
    idEmpresa?: number | null,
    signal?: AbortSignal,
  ): Promise<UnitItem[]> {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (idEmpresa) params.set("id_empresa", String(idEmpresa));

    const query = params.toString() ? `/units?${params.toString()}` : "/units";

    return apiFetch<UnitItem[]>(query, {
      method: "GET",
      signal,
    });
  },

  createUnit(payload: CreateUnitPayload): Promise<CreateUnitResponse> {
    return apiFetch<CreateUnitResponse>("/units", {
      method: "POST",
      body: payload,
    });
  },

  // Obtiene el detalle completo de una unidad. El backend filtra los
  // campos técnicos (IMEI, chip, modelo AVL, inputs, outputs, fecha
  // instalación) si el rol del usuario no es sudo_erp — por eso esos
  // campos son opcionales en el tipo UnitDetail.
  //
  // idEmpresa se pasa como query param cuando el usuario es sudo_erp
  // (su JWT no tiene id_empresa fijo). Para admin_empresa/usuario el
  // backend lo toma del JWT y valida que coincida si viene en el query.
  //
  // Requiere permiso `cund_edit`. Si el usuario no lo tiene, el backend
  // responde 403. La UI debe ocultar el botón "Editar" en ese caso para
  // no disparar una petición que sabemos que fallará.
  getDetail(
    idUnidad: number,
    idEmpresa?: number | null,
    signal?: AbortSignal,
  ): Promise<UnitDetail> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<UnitDetail>(`/units/${idUnidad}${query}`, {
      method: "GET",
      signal,
    });
  },

  // Actualización parcial (PATCH). Solo se mandan los campos que cambiaron.
  //
  // idEmpresa: ver nota en getDetail. Mismo patrón — el sudo_erp lo pasa
  // explícitamente, el resto lo toma del JWT.
  //
  // El servidor valida que el rol del usuario tenga permiso para modificar
  // cada campo del payload — si un admin_empresa intenta mandar `imei` u
  // otro campo técnico, responde 403 con code="FIELDS_NOT_ALLOWED".
  //
  // En caso de error el apiFetch lanza una excepción con el message del
  // backend; el consumidor (hook useUnitEdit) captura y muestra al usuario.
  update(
    idUnidad: number,
    payload: UpdateUnitPayload,
    idEmpresa?: number | null,
  ): Promise<UpdateUnitResponse> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<UpdateUnitResponse>(`/units/${idUnidad}${query}`, {
      method: "PATCH",
      body: payload,
    });
  },

  // Elimina (soft-delete) una unidad — la marca con status=0 en BD.
  //
  // Requiere permiso `unidades.eliminar`. El backend rechaza con 403
  // si el usuario no lo tiene. La UI debe ocultar el botón "Eliminar"
  // cuando usePermiso("unidades.eliminar") devuelve false para no
  // disparar una petición que sabemos que fallará.
  //
  // idEmpresa: mismo patrón que getDetail/update — sudo_erp lo pasa
  // explícitamente, otros roles lo heredan del JWT.
  delete(
    idUnidad: number,
    idEmpresa?: number | null,
  ): Promise<DeleteUnitResponse> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<DeleteUnitResponse>(`/units/${idUnidad}${query}`, {
      method: "DELETE",
    });
  },

  // Sube la imagen de la unidad y devuelve la ruta pública con la que el
  // backend la sirve. Esa ruta es la que se guarda en el campo imagen.
  uploadImage(file: File): Promise<{ ruta: string }> {
    return apiUpload<{ ruta: string }>("/units/upload-image", file);
  },

  // ── Token de rastreo ───────────────────────────────────────────────────────
  // Mismo patrón de idEmpresa que getDetail/update: sudo_erp lo pasa explícito,
  // otros roles lo heredan del JWT.

  // Lee la configuración del token de rastreo de la unidad.
  getTokenConfig(
    idUnidad: number,
    idEmpresa?: number | null,
  ): Promise<UnitTokenConfig> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<UnitTokenConfig>(`/units/${idUnidad}/token${query}`, {
      method: "GET",
    });
  },

  // Genera (o regenera) el token PERMANENTE (sin expiración).
  regenerateToken(
    idUnidad: number,
    idEmpresa?: number | null,
  ): Promise<RegenerateUnitTokenResponse> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<RegenerateUnitTokenResponse>(
      `/units/${idUnidad}/token/regenerar${query}`,
      { method: "POST" },
    );
  },

  // Revoca el token: el enlace público deja de funcionar de inmediato.
  revokeToken(
    idUnidad: number,
    idEmpresa?: number | null,
  ): Promise<{ message: string }> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<{ message: string }>(`/units/${idUnidad}/token${query}`, {
      method: "DELETE",
    });
  },

  listGroups(search = "", idEmpresa?: number | null): Promise<any[]> {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (idEmpresa) params.set("id_empresa", String(idEmpresa));
    return apiFetch<any[]>(`/units/groups?${params.toString()}`);
  },

  createGroup(payload: any): Promise<any> {
    return apiFetch<any>("/units/groups", {
      method: "POST",
      body: payload,
    });
  },

  updateGroup(idGrupoUnidades: number, payload: any, idEmpresa?: number | null): Promise<any> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<any>(`/units/groups/${idGrupoUnidades}${query}`, {
      method: "PATCH",
      body: payload,
    });
  },

  deleteGroup(idGrupoUnidades: number, idEmpresa?: number | null): Promise<any> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<any>(`/units/groups/${idGrupoUnidades}${query}`, {
      method: "DELETE",
    });
  },

  listClients(idEmpresa?: number | null): Promise<any[]> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<any[]>(`/units/clients${query}`);
  },

  listPois(idEmpresa?: number | null): Promise<any[]> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<any[]>(`/units/pois${query}`);
  },

  // Genera el token TEMPORAL con expiración.
  regenerateTemporalToken(
    idUnidad: number,
    idEmpresa?: number | null,
    payload?: { minutos_expiracion: number },
  ): Promise<RegenerateUnitTokenResponse> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<RegenerateUnitTokenResponse>(
      `/units/${idUnidad}/token/temporal/regenerar${query}`,
      { method: "POST", body: payload },
    );
  },

  // Revoca SOLO el token temporal.
  revokeTemporalToken(
    idUnidad: number,
    idEmpresa?: number | null,
  ): Promise<{ message: string }> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<{ message: string }>(
      `/units/${idUnidad}/token/temporal${query}`,
      { method: "DELETE" },
    );
  },
};