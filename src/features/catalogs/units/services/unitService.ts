import { apiFetch } from "@/lib/api";
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
};