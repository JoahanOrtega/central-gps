import { useQuery } from "@tanstack/react-query";
import { catalogService } from "@/features/catalogs/units/services/catalogServices";
import { poiService } from "@/features/catalogs/pois/poiService";
import { queryKeys } from "@/lib/query-keys";

// ── Hooks de catálogos con TanStack Query ─────────────────────────────────────
//
// Antes: cada apertura de modal disparaba 3 peticiones simultáneas.
// Ahora: los datos se cachean 5 minutos — abrir el modal 5 veces en 5 min
// hace exactamente 1 petición por catálogo.
//
// El caché es por empresa: si el usuario cambia de empresa, se usan
// los datos cacheados de esa empresa (o se cargan si no hay caché).
//
// Uso en NewUnitModal:
//   const { data: operators = [], isLoading: loadingOps } = useOperators(idEmpresa);
//   const { data: unitGroups = [], isLoading: loadingGroups } = useUnitGroups(idEmpresa);
//   const { data: avlModels = [] } = useAvlModels();

/**
 * Retorna los operadores disponibles para asignar a unidades.
 *
 * enabled: false cuando no hay empresa activa — evita peticiones
 * sin id_empresa que causarían 400 en el backend.
 */
export const useOperators = (idEmpresa: number | null | undefined) =>
    useQuery({
        queryKey: queryKeys.catalogs.operators(idEmpresa),
        queryFn: () => catalogService.getOperators(undefined, idEmpresa),
        enabled: !!idEmpresa,
        // Los operadores no cambian frecuentemente — 5 min de stale es suficiente.
        // Si se crea un operador nuevo, invalidar manualmente con:
        //   queryClient.invalidateQueries({ queryKey: queryKeys.catalogs.operators(idEmpresa) })
        staleTime: 5 * 60 * 1000,
    });

/**
 * Retorna los grupos de unidades disponibles para clasificar.
 */
export const useUnitGroups = (idEmpresa: number | null | undefined) =>
    useQuery({
        queryKey: queryKeys.catalogs.unitGroups(idEmpresa),
        queryFn: () => catalogService.getUnitGroups(undefined, idEmpresa),
        enabled: !!idEmpresa,
        staleTime: 5 * 60 * 1000,
    });

/**
 * Retorna los modelos de dispositivos AVL disponibles.
 *
 * No depende de empresa — todos los usuarios ven los mismos modelos.
 * staleTime más largo porque el catálogo de hardware cambia muy poco.
 */
export const useAvlModels = () =>
    useQuery({
        queryKey: queryKeys.catalogs.avlModels(),
        queryFn: () => catalogService.getAvlModels(),
        staleTime: 15 * 60 * 1000,     // 15 minutos — cambia muy poco
    });

/**
 * Retorna los clientes disponibles para asignar a grupos de POIs.
 */
export const useClients = (idEmpresa: number | null | undefined) =>
    useQuery({
        queryKey: queryKeys.catalogs.clients(idEmpresa),
        queryFn: () => poiService.getClients(idEmpresa),
        enabled: !!idEmpresa,
        staleTime: 5 * 60 * 1000,
    });