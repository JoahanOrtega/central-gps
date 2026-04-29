// Hook que expone el id_empresa activo del usuario.
//
// Es la fuente de verdad para saber en qué empresa está trabajando
// el usuario en este momento. Todas las vistas que muestran datos
// filtrados por empresa deben usarlo como dependencia en su useEffect.
//
// Resolución del id_empresa (en orden de prioridad):
//   1. companyStore.currentCompany — la empresa activa seleccionada en
//      el selector del navbar. El sudo_erp puede cambiarla manualmente
//      a cualquier empresa del sistema; admin_empresa y usuario solo
//      ven la suya y no pueden cambiarla.
//   2. authStore.user.id_empresa — fallback al JWT cuando companyStore
//      aún no se ha populado (caso típico: admin_empresa que entró
//      directo a una ruta sin pasar por el navbar que dispara
//      fetchCompanies).
//
// Cuando el usuario cambia de empresa vía SwitchCompanyModal:
//   1. companyStore actualiza currentCompany
//   2. Este hook detecta el cambio y retorna el nuevo id
//   3. Cualquier useEffect que dependa de este valor se re-ejecuta
//   4. Los datos de la vista se recargan automáticamente con la nueva empresa

import { useCompanyStore } from "@/stores/companyStore";
import { useAuthStore } from "@/stores/authStore";

interface EmpresaActiva {
    // ID de la empresa activa — null si aún no se ha cargado y el JWT
    // tampoco trae id_empresa (caso del sudo_erp en modo "Particular").
    idEmpresa: number | null;
    // Nombre de la empresa activa (solo si vino del companyStore;
    // null cuando el id viene solo del JWT, sin nombre asociado).
    nombreEmpresa: string | null;
    // True mientras fetchCompanies está corriendo
    isLoading: boolean;
}

export const useEmpresaActiva = (): EmpresaActiva => {
    const currentCompany = useCompanyStore((state) => state.currentCompany);
    const isLoading = useCompanyStore((state) => state.isLoading);
    // Leer el id_empresa del JWT como fallback. Necesario para roles que
    // NO disparan fetchCompanies (admin_empresa, usuario) — el companyStore
    // queda vacío para ellos pero su JWT sí trae la empresa correcta.
    const userIdEmpresa = useAuthStore((state) => state.user?.id_empresa ?? null);

    // currentCompany manda cuando existe (puede haber cambiado vía switch).
    // Si no, usar el JWT como respaldo.
    const idEmpresa = currentCompany?.id_empresa ?? userIdEmpresa;

    return {
        idEmpresa,
        nombreEmpresa: currentCompany?.nombre ?? null,
        isLoading,
    };
};