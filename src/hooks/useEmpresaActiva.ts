// Hook que expone el id_empresa activo del usuario.
//
// Es la fuente de verdad para saber en qué empresa está trabajando
// el usuario en este momento. Todas las vistas que muestran datos
// filtrados por empresa deben usarlo como dependencia en su useEffect.
//
// Cuando el usuario cambia de empresa vía SwitchCompanyModal:
//   1. companyStore actualiza currentCompany
//   2. Este hook detecta el cambio y retorna el nuevo id
//   3. Cualquier useEffect que dependa de este valor se re-ejecuta
//   4. Los datos de la vista se recargan automáticamente con la nueva empresa

import { useCompanyStore } from "@/stores/companyStore";

interface EmpresaActiva {
    // ID de la empresa activa — null si aún no se ha cargado
    idEmpresa: number | null;
    // Nombre de la empresa activa
    nombreEmpresa: string | null;
    // True mientras fetchCompanies está corriendo
    isLoading: boolean;
}

export const useEmpresaActiva = (): EmpresaActiva => {
    const currentCompany = useCompanyStore((state) => state.currentCompany);
    const isLoading = useCompanyStore((state) => state.isLoading);

    return {
        idEmpresa: currentCompany?.id_empresa ?? null,
        nombreEmpresa: currentCompany?.nombre ?? null,
        isLoading,
    };
};