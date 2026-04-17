import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useCompanyStore } from "@/stores/companyStore";
import { usePermisos } from "@/hooks/usePermiso";
import {
  Building2, ChevronDown, FolderOpen,
  Fuel, Map, Menu, Package, ShieldCheck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/shared/UserMenu";
import { SwitchCompanyModal } from "@/components/shared/SwitchCompanyModal";

// ── Tipo explícito para los items del navbar ──────────────
interface NavItem {
  id: string;
  label: string;
  path: string;
  grupo: string;
  permiso: string | null;
}

// ── Catálogo de items del navbar ──────────────────────────
const NAV_ITEMS: NavItem[] = [
  { id: "units", label: "Unidades", path: "/home/catalogs/units", grupo: "catalogs", permiso: "cund1" },
  { id: "clients", label: "Clientes", path: "/home/catalogs/clients", grupo: "catalogs", permiso: "cclt1" },
  { id: "operators", label: "Operadores", path: "/home/catalogs/operators", grupo: "catalogs", permiso: "cop1" },
  { id: "points-of-interest", label: "Puntos de Interés", path: "/home/catalogs/points-of-interest", grupo: "catalogs", permiso: "cpoi1" },
  { id: "gas-stations", label: "Gasolineras", path: "/home/catalogs/gas-stations", grupo: "catalogs", permiso: "cgas1" },
  { id: "users", label: "Usuarios", path: "/home/catalogs/users", grupo: "catalogs", permiso: null },
  { id: "monitor", label: "Monitor de flota", path: "/home/operation/monitor", grupo: "operation", permiso: "on" },
  { id: "fuel-general", label: "General", path: "/home/fuel/general", grupo: "fuel", permiso: "cfuel1" },
];

const TODAS_LAS_CLAVES: string[] = [
  ...new Set(
    NAV_ITEMS
      .map((i) => i.permiso)
      .filter((p): p is string => p !== null)
  ),
];


const GRUPOS_CONFIG = [
  { id: "catalogs", label: "Catálogos", icon: <FolderOpen className="h-4 w-4" /> },
  { id: "operation", label: "Operación", icon: <Map className="h-4 w-4" /> },
  { id: "fuel", label: "Combustible", icon: <Fuel className="h-4 w-4" /> },
];

// ── Rutas del panel ERP (solo visibles para sudo_erp) ────
const ERP_NAV_ITEMS = [
  { id: "erp-empresas", label: "Empresas", path: "/home/admin-erp/empresas" },
  { id: "erp-permisos", label: "Permisos", path: "/home/admin-erp/permisos" },
  { id: "erp-auditoria", label: "Auditoría", path: "/home/admin-erp/auditoria" },
];

interface HomeNavbarProps {
  onOpenMobileMenu?: () => void;
}

export const HomeNavbar = ({ onOpenMobileMenu }: HomeNavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { currentCompany, fetchCompanies, fetchError } = useCompanyStore();
  const [switchModalOpen, setSwitchModalOpen] = useState(false);

  // Verificar todos los permisos del navbar en una sola llamada
  const permisosActivos = usePermisos(TODAS_LAS_CLAVES);

  // Flags de rol para condicionales visuales
  const esSudoErp = user?.rol === "sudo_erp";

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user, fetchCompanies]);

  // Items visibles para este usuario según sus permisos
  const itemsVisibles = NAV_ITEMS.filter((item) =>
    item.permiso === null ? true : (permisosActivos[item.permiso] ?? false)
  );

  // Detectar si la ruta activa está dentro del panel ERP
  const isErpActive = location.pathname.startsWith("/home/admin-erp");

  return (
    <header className="border-b border-slate-200 bg-white">

      {/* ── Banda indicadora de rol sudo ERP ─────────────────
          Visible solo para sudo_erp. Sirve como recordatorio
          constante de que está operando con privilegios totales. */}
      {esSudoErp && (
        <div className="flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-1">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-xs font-medium text-amber-700">
            Modo Administrador ERP — tienes acceso total al sistema
          </span>
        </div>
      )}

      <div className="flex min-h-[72px] items-center justify-between gap-3 px-3 md:h-[88px] md:px-6">

        {/* ── Navegación izquierda ── */}
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Abrir menú de navegación"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">

            {/* Módulos normales del sistema */}
            {GRUPOS_CONFIG.map((grupo) => {
              const items = itemsVisibles.filter((i) => i.grupo === grupo.id);
              if (items.length === 0) return null;

              const isGroupActive = items.some((i) =>
                location.pathname.startsWith(i.path)
              );

              return (
                <DropdownMenu key={grupo.id}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:px-4",
                        isGroupActive
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                      )}
                    >
                      {grupo.icon}
                      <span className="hidden sm:inline">{grupo.label}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="start" className="w-[240px] max-w-[85vw]">
                    {items.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => navigate(item.path)}
                        className={cn(
                          "cursor-pointer rounded-md px-3 py-2",
                          location.pathname === item.path && "bg-[#f7f4e8] text-sky-600"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}

            {/* ── Botón panel ERP — solo visible para sudo_erp ── */}
            {esSudoErp && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:px-4",
                      isErpActive
                        ? "bg-amber-100 text-amber-900"
                        : "text-amber-700 hover:bg-amber-50 border border-amber-200"
                    )}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Panel ERP</span>
                    <ChevronDown className="h-4 w-4 text-amber-500" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start" className="w-[200px]">
                  {ERP_NAV_ITEMS.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "cursor-pointer rounded-md px-3 py-2",
                        location.pathname === item.path && "bg-amber-50 text-amber-700"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

          </div>
        </div>

        {/* ── Acciones derecha ── */}
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <button
            onClick={() => setSwitchModalOpen(true)}
            className={cn(
              "group flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium shadow-sm transition-all md:px-4 md:py-2",
              fetchError
                ? "border-red-300 text-red-600 hover:border-red-400 hover:bg-red-50"
                : "border-blue-300 text-blue-700 hover:border-blue-400 hover:bg-blue-50 hover:shadow"
            )}
          >
            <Building2 className={cn("h-4 w-4 shrink-0", fetchError ? "text-red-400" : "text-blue-500")} />
            <span className="max-w-[120px] truncate sm:max-w-[180px] lg:max-w-[240px]">
              {fetchError ? "Error al cargar" : (currentCompany?.nombre || "Cargando...")}
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform group-hover:rotate-180", fetchError ? "text-red-400" : "text-blue-500")} />
          </button>

          <SwitchCompanyModal
            open={switchModalOpen}
            onOpenChange={setSwitchModalOpen}
          />

          <UserMenu />
        </div>
      </div>
    </header>
  );
};