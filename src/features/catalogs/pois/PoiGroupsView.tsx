import { useState } from "react";
import { FolderTree, Plus, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { poiService } from "./poiService";
import type { PoiGroupItem } from "./poi.types";
import { NewPoiGroupModal } from "./NewPoiGroupModal";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { EmptyState } from "@/components/shared/EmptyState";
import { queryKeys } from "@/lib/query-keys";

export const PoiGroupsView = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { idEmpresa } = useEmpresaActiva();

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout((handleSearchChange as unknown as { _t: ReturnType<typeof setTimeout> })._t);
    (handleSearchChange as unknown as { _t: ReturnType<typeof setTimeout> })._t =
      setTimeout(() => setDebouncedSearch(value), 350);
  };

  const { data: groups = [], isLoading, error, refetch } = useQuery<PoiGroupItem[]>({
    queryKey: queryKeys.pois.groups(idEmpresa),
    queryFn: () => poiService.getPoiGroups(debouncedSearch, idEmpresa),
    enabled: !!idEmpresa,
  });

  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
      <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <FolderTree className="h-5 w-5 text-slate-500" />
            <h1 className="text-2xl font-semibold text-slate-800">Grupos de Puntos de Interés</h1>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setIsCreateModalOpen(true)} className="flex h-10 w-12 items-center justify-center rounded-lg border border-emerald-400 bg-white text-emerald-500 hover:bg-emerald-50" title="Agregar grupo">
              <Plus className="h-4 w-4" />
            </button>
            <div className="flex items-center rounded-lg border border-slate-300 bg-white">
              <div className="flex h-10 w-10 items-center justify-center border-r border-slate-300 text-emerald-500">
                <Search className="h-4 w-4" />
              </div>
              <input type="text" value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="buscar..." className="h-10 w-56 rounded-r-lg px-3 text-sm outline-none" />
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading && <div className="py-10 text-center text-slate-500">Cargando grupos...</div>}

          {errorMessage && (
            <EmptyState icon={FolderTree} title="No se pudieron cargar los grupos" description={errorMessage} actionLabel="Reintentar" onAction={() => refetch()} />
          )}

          {!isLoading && !errorMessage && groups.length === 0 && (
            <div className="py-10 text-center text-slate-500">No hay grupos para mostrar</div>
          )}

          {!isLoading && !errorMessage && groups.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {["ID", "Nombre", "Cliente", "POIs", "Predeterminado", "Observaciones"].map((h) => (
                      <th key={h} className="border-b border-slate-200 px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr key={group.id_grupo_pois} className="hover:bg-slate-50">
                      <td className="border-b border-slate-200 px-4 py-3">{group.id_grupo_pois}</td>
                      <td className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">{group.nombre}</td>
                      <td className="border-b border-slate-200 px-4 py-3">{group.id_cliente || "---"}</td>
                      <td className="border-b border-slate-200 px-4 py-3">{group.pois}</td>
                      <td className="border-b border-slate-200 px-4 py-3">{group.is_default === 1 ? "Sí" : "No"}</td>
                      <td className="border-b border-slate-200 px-4 py-3 text-slate-500">{group.observaciones || "---"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <NewPoiGroupModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} onCreated={() => refetch()} />
    </main>
  );
};