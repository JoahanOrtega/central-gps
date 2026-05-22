import { apiFetch } from "@/lib/api";
import type {
  ClientItem,
  CreateClientPayload,
  UpdateClientPayload,
} from "./client.types";

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
    if (idEmpresa)     params.set("id_empresa", String(idEmpresa));

    const query = params.toString()
      ? `/catalogs/clients?${params.toString()}`
      : "/catalogs/clients";

    return apiFetch<ClientItem[]>(query, { method: "GET", signal });
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
};