import { apiFetch } from "@/lib/api";
import type {
  ClientDashboardConfig,
  ClientItem,
  ClientTokenConfig,
  ClientTokenResponse,
  CreateClientPayload,
  UpdateClientPayload,
} from "../types/client.types";

// Respuesta del DELETE
interface DeleteClientResponse {
  message: string;
}

export const clientService = {
  /**
   * Lista todos los clientes de la empresa.
   * El id_empresa del JWT ya filtra por empresa — solo se pasa si el
   * usuario es sudo_erp.
   */
  list(
    search = "",
    idEmpresa?: number | null,
    signal?: AbortSignal,
  ): Promise<ClientItem[]> {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (idEmpresa) params.set("id_empresa", String(idEmpresa));

    const query = params.toString()
      ? `/catalogs/clients?${params.toString()}`
      : "/catalogs/clients";

    return apiFetch<ClientItem[]>(query, { method: "GET", signal });
  },

  getById(
    idCliente: number,
    idEmpresa?: number | null,
  ): Promise<ClientItem> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<ClientItem>(
      `/catalogs/clients/${idCliente}${query}`,
      { method: "GET" },
    );
  },


  /**
   * Crea un nuevo cliente.
   * El backend genera token y token_dashboard automáticamente.
   * Responde 409 con code="CLAVE_TAKEN" si la clave ya existe.
   */
  create(payload: CreateClientPayload): Promise<ClientItem> {
    return apiFetch<ClientItem>("/catalogs/clients", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Actualiza solo los campos que se pasen en el payload.
   * Responde 409 con code="CLAVE_TAKEN" si la nueva clave ya existe.
   */
  update(
    idCliente: number,
    payload: UpdateClientPayload,
    idEmpresa?: number | null,
  ): Promise<ClientItem> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<ClientItem>(`/catalogs/clients/${idCliente}${query}`, {
      method: "PUT",
      body: payload,
    });
  },

  // Elimina un cliente de forma permanente.
  delete(
    idCliente: number,
    idEmpresa?: number | null,
  ): Promise<DeleteClientResponse> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<DeleteClientResponse>(
      `/catalogs/clients/${idCliente}${query}`,
      { method: "DELETE" },
    );
  },

  // Lee la configuración de token de rastreo y dashboard del cliente.
  getTokenConfig(
    idCliente: number,
    idEmpresa?: number | null,
  ): Promise<ClientTokenResponse> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch<ClientTokenResponse>(
      `/catalogs/clients/${idCliente}/token${query}`,
      { method: "GET" },
    );
  },

  // Genera (o regenera) el token de rastreo y activa el acceso.
  regenerateToken(
    idCliente: number,
    idEmpresa?: number | null,
  ): Promise<{ message: string; token: string }> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch(`/catalogs/clients/${idCliente}/token/regenerar${query}`, {
      method: "POST",
    });
  },

  // Actualiza las opciones de token/dashboard (no el token en sí).
  updateTokenConfig(
    idCliente: number,
    payload: Partial<ClientTokenConfig & ClientDashboardConfig>,
    idEmpresa?: number | null,
  ): Promise<ClientTokenResponse & { message: string }> {
    const query = idEmpresa ? `?id_empresa=${idEmpresa}` : "";
    return apiFetch(`/catalogs/clients/${idCliente}/token${query}`, {
      method: "PUT",
      body: payload,
    });
  },
};

