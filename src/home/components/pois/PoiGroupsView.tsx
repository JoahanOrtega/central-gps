import { useEffect, useState } from "react";
import { FolderTree, Plus, Search } from "lucide-react";

import { poiService } from "../../services/poiService";
import type { PoiGroupItem } from "../../types/poi.types";
import { NewPoiGroupModal } from "./NewPoiGroupModal";

export const PoiGroupsView = () => {
  const [groups, setGroups] = useState<PoiGroupItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadPoiGroups = async (searchValue = "") => {
    try {
      setIsLoading(true);
      setError("");

      const data = await poiService.getPoiGroups(searchValue);
      setGroups(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al cargar grupos de POIs";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadPoiGroups(search);
    }, 350);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    loadPoiGroups();
  }, []);

  return (
    <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
      <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <FolderTree className="h-5 w-5 text-slate-500" />
            <h1 className="text-2xl font-semibold text-slate-800">
              Grupos de Puntos de Interés
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex h-10 w-12 items-center justify-center rounded-lg border border-emerald-400 bg-white text-emerald-500 hover:bg-emerald-50"
              title="Agregar grupo"
            >
              <Plus className="h-4 w-4" />
            </button>

            <div className="flex items-center rounded-lg border border-slate-300 bg-white">
              <div className="flex h-10 w-10 items-center justify-center border-r border-slate-300 text-emerald-500">
                <Search className="h-4 w-4" />
              </div>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="buscar..."
                className="h-10 w-56 rounded-r-lg px-3 text-sm outline-none"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading && (
            <div className="py-10 text-center text-slate-500">
              Cargando grupos...
            </div>
          )}

          {error && (
            <div className="py-10 text-center text-red-500">{error}</div>
          )}

          {!isLoading && !error && groups.length === 0 && (
            <div className="py-10 text-center text-slate-500">
              No hay grupos para mostrar
            </div>
          )}

          {!isLoading && !error && groups.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3 text-left">
                      ID
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left">
                      Nombre
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left">
                      Cliente
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left">
                      POIs
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left">
                      Predeterminado
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left">
                      Observaciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {groups.map((group) => (
                    <tr key={group.id_grupo_pois} className="hover:bg-slate-50">
                      <td className="border-b border-slate-200 px-4 py-3">
                        {group.id_grupo_pois}
                      </td>
                      <td className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">
                        {group.nombre}
                      </td>
                      <td className="border-b border-slate-200 px-4 py-3">
                        {group.id_cliente || "---"}
                      </td>
                      <td className="border-b border-slate-200 px-4 py-3">
                        {group.pois}
                      </td>
                      <td className="border-b border-slate-200 px-4 py-3">
                        {group.is_default === 1 ? "Sí" : "No"}
                      </td>
                      <td className="border-b border-slate-200 px-4 py-3 text-slate-500">
                        {group.observaciones || "---"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <NewPoiGroupModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreated={() => loadPoiGroups(search)}
      />
    </main>
  );
};
