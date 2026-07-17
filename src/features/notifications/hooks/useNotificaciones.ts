import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompanyStore } from "@/stores/companyStore";
import { getNotificaciones, marcarLeidas } from "../notificationService";
import type { NotificacionesResponse } from "../notification.types";

// Key compartida: usePoiEvents la invalida cuando llega un unit_state_event
// por WS — así el badge sube en vivo sin esperar el refetch periódico.
export const NOTIFICACIONES_KEY = "notificaciones";

export const useNotificaciones = () => {
    const idEmpresa = useCompanyStore(
        (s) => s.currentCompany?.id_empresa ?? null,
    );

    const query = useQuery({
        queryKey: [NOTIFICACIONES_KEY, idEmpresa],
        queryFn: () => getNotificaciones(idEmpresa as number),
        enabled: idEmpresa !== null,
        // Refetch de respaldo: el camino principal de frescura es la
        // invalidación por WS; esto cubre desconexiones del socket.
        refetchInterval: 60_000,
        staleTime: 30_000,
    });

    return { ...query, idEmpresa };
};

export const useMarcarLeidas = () => {
    const queryClient = useQueryClient();
    const idEmpresa = useCompanyStore(
        (s) => s.currentCompany?.id_empresa ?? null,
    );
    const key = [NOTIFICACIONES_KEY, idEmpresa];

    return useMutation({
        mutationFn: (ids?: number[]) =>
            marcarLeidas(idEmpresa as number, ids),
        // Optimistic: el punto azul y el badge desaparecen al instante
        // (patrón Gmail) — si el servidor falla, rollback al snapshot.
        onMutate: async (ids) => {
            await queryClient.cancelQueries({ queryKey: key });
            const previo =
                queryClient.getQueryData<NotificacionesResponse>(key);
            if (previo) {
                queryClient.setQueryData<NotificacionesResponse>(key, {
                    items: previo.items.map((n) =>
                        !ids || ids.includes(n.id)
                            ? { ...n, leida: true }
                            : n,
                    ),
                    no_leidas: ids
                        ? Math.max(0, previo.no_leidas - ids.length)
                        : 0,
                });
            }
            return { previo };
        },
        onError: (_err, _ids, ctx) => {
            if (ctx?.previo) queryClient.setQueryData(key, ctx.previo);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: key });
        },
    });
};
