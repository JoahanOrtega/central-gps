import { useEffect, useState, useMemo } from "react";
import { Building2, Check, Search, X } from "lucide-react";
import { handleError } from "@/lib/handle-error";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useCompanyStore } from "@/stores/companyStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

interface SwitchCompanyModalProps {
    open: boolean;                      // Controla si el modal está abierto
    onOpenChange: (open: boolean) => void; // Función para cambiar el estado de apertura
}

export const SwitchCompanyModal = ({
    open,
    onOpenChange,
}: SwitchCompanyModalProps) => {
    // --- Hooks de estado global ---
    const { user } = useAuthStore();                     // Datos del usuario autenticado
    const {
        companies,                                        // Lista de empresas disponibles
        currentCompany,                                   // Empresa activa actualmente
        isLoading,                                        // Estado de carga de empresas
        fetchError,                                       // Error de la última carga
        fetchCompanies,                                   // Función para obtener empresas del backend
        switchCompany,                                    // Función para cambiar de empresa
    } = useCompanyStore();

    // --- Estado local del componente ---
    const [search, setSearch] = useState("");            // Texto de búsqueda
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null); // ID de empresa seleccionada
    const [isSubmitting, setIsSubmitting] = useState(false); // Estado durante el cambio de empresa

    // --- Efecto: cargar empresas al abrir el modal ----------------
    // Solo hace la petición si:
    //   a) La lista aún no se ha cargado (companies.length === 0)
    //   b) Hubo un error en la carga anterior (fetchError !== null)
    // Esto evita una petición innecesaria cada vez que el usuario
    // abre el modal cuando la lista ya está disponible en el store.
    useEffect(() => {
        if (open && user && (companies.length === 0 || fetchError !== null)) {
            fetchCompanies();
        }
    }, [open, user, companies.length, fetchError, fetchCompanies]);

    // --- Efecto: preseleccionar la empresa actual al abrir el modal ---
    useEffect(() => {
        if (open && currentCompany) {
            setSelectedCompanyId(currentCompany.id_empresa);
        }
    }, [open, currentCompany]);

    // --- Filtrado de empresas según el texto de búsqueda (memoizado) ---
    const filteredCompanies = useMemo(() => {
        if (!search.trim()) return companies;
        return companies.filter((company) =>
            company.nombre.toLowerCase().includes(search.toLowerCase())
        );
    }, [companies, search]);

    // --- Manejo del cambio de empresa ---
    const handleSave = async () => {
        if (!selectedCompanyId) return;
        setIsSubmitting(true);
        try {
            await switchCompany(selectedCompanyId);
            onOpenChange(false);
            // Recarga para aplicar la nueva empresa en toda la app
        } catch (error) {
            handleError(error, "No fue posible cambiar de empresa");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Cancelar: restaurar selección y cerrar modal ---
    const handleCancel = () => {
        setSelectedCompanyId(currentCompany?.id_empresa ?? null);
        setSearch("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>

            <DialogContent
                className="w-[95vw] max-w-[500px] p-0 overflow-hidden"
                showCloseButton={false}
            >
                {/* Cabecera con título y botón de cerrar */}
                <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                        <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                            <Building2 className="h-5 w-5 text-blue-500" />
                            Cambiar empresa
                        </DialogTitle>
                        {/* Descripción accesible (soluciona el warning de shadcn) */}
                        <DialogDescription className="sr-only">
                            Selecciona una empresa de la lista para cambiar el contexto de trabajo.
                        </DialogDescription>
                    </div>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </DialogHeader>

                {/* Cuerpo del modal: búsqueda y lista de empresas */}
                <div className="px-5 py-4">
                    {isLoading ? (
                        // Estado de carga
                        <div className="py-10 text-center">
                            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                            <p className="mt-3 text-sm text-slate-500">Cargando empresas...</p>
                        </div>
                    ) : fetchError ? (
                        // Error al cargar — mostrar mensaje y botón de reintento
                        <div className="py-10 text-center">
                            <p className="text-sm font-medium text-red-600">{fetchError}</p>
                            <button
                                type="button"
                                onClick={fetchCompanies}
                                className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : companies.length === 0 ? (
                        // No hay empresas disponibles
                        <div className="py-10 text-center">
                            <Building2 className="mx-auto h-10 w-10 text-slate-300" />
                            <p className="mt-2 text-sm font-medium text-slate-700">
                                No hay empresas disponibles
                            </p>
                            <p className="text-xs text-slate-500">
                                Contacta al administrador para que te asigne una empresa.
                            </p>
                        </div>
                    ) : (
                        // Lista de empresas con búsqueda
                        <div className="space-y-3">
                            {/* Campo de búsqueda */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar empresa por nombre..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm transition-shadow focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            {/* Lista de empresas filtradas */}
                            <div className="max-h-[320px] overflow-y-auto rounded-md border border-slate-200">
                                {filteredCompanies.length === 0 ? (
                                    // Sin resultados de búsqueda
                                    <div className="py-8 text-center text-sm text-slate-500">
                                        No se encontraron empresas con "{search}"
                                    </div>
                                ) : (
                                    // Listado de empresas como opciones de radio
                                    <div className="divide-y divide-slate-100">
                                        {filteredCompanies.map((company) => {
                                            const isSelected = company.id_empresa === selectedCompanyId;
                                            const isCurrent = company.id_empresa === currentCompany?.id_empresa;

                                            return (
                                                <label
                                                    key={company.id_empresa}
                                                    className={cn(
                                                        "flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50",
                                                        isSelected && "bg-blue-50"
                                                    )}
                                                >
                                                    {/* Radio button (oculto visualmente pero accesible) */}
                                                    <input
                                                        type="radio"
                                                        name="company"
                                                        value={company.id_empresa}
                                                        checked={isSelected}
                                                        onChange={() => setSelectedCompanyId(company.id_empresa)}
                                                        className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    {/* Avatar con inicial */}
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                                                        {company.nombre.charAt(0).toUpperCase()}
                                                    </div>
                                                    {/* Nombre de la empresa y etiqueta "Actual" si corresponde */}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                            <span className="truncate text-sm font-medium text-slate-800">
                                                                {company.nombre}
                                                            </span>
                                                            {isCurrent && (
                                                                <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                                                    Actual
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Icono de check cuando está seleccionada */}
                                                    {isSelected && (
                                                        <Check className="h-5 w-5 shrink-0 text-blue-600" />
                                                    )}
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Pie del modal con botones de acción */}
                <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!selectedCompanyId || isSubmitting}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? "Cambiando..." : "Cambiar empresa"}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};