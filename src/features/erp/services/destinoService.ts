import { apiFetch } from "@/lib/api";
import type {
  Destino,
  CrearDestinoPayload,
  EditarDestinoPayload,
} from "../types/destino.types";

export const destinoService = {
  // GET /whatsapp/destinos  → lista todos (vista sudo)
  listar(): Promise<Destino[]> {
    return apiFetch<Destino[]>(`/whatsapp/destinos`);
  },

  // POST /whatsapp/destinos
  // persona → { telefono }; grupo → { participantes } (backend crea el grupo).
  crear(payload: CrearDestinoPayload): Promise<Destino> {
    return apiFetch<Destino>(`/whatsapp/destinos`, {
      method: "POST",
      body: payload,
    });
  },

  // PUT /whatsapp/destinos/{id}  → editar nombre (y teléfono si es persona)
  editar(idDestino: number, payload: EditarDestinoPayload): Promise<Destino> {
    return apiFetch<Destino>(`/whatsapp/destinos/${idDestino}`, {
      method: "PUT",
      body: payload,
    });
  },

  // PATCH /whatsapp/destinos/{id}  → activar/desactivar (baja lógica)
  cambiarStatus(
    idDestino: number,
    idEmpresa: number,
    status: number,
  ): Promise<{ id_destino_whatsapp: number; status: number }> {
    return apiFetch(`/whatsapp/destinos/${idDestino}`, {
      method: "PATCH",
      body: { id_empresa: idEmpresa, status },
    });
  },

  // DELETE /whatsapp/destinos/{id}  → eliminar (CASCADE borra su historial)
  async eliminar(idDestino: number, idEmpresa: number): Promise<void> {
    await apiFetch(`/whatsapp/destinos/${idDestino}`, {
      method: "DELETE",
      body: { id_empresa: idEmpresa },
    });
  },
};