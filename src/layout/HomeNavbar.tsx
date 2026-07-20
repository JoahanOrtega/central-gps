import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useCompanyStore } from "@/stores/companyStore";
import { usePermisos } from "@/hooks/usePermiso";
import {
  Building2, CalendarClock, ChevronDown,
  Fuel, MapPinned, Menu, Route, ShieldCheck,
  Tag, Truck, Users, Map, FolderOpen, ClipboardList,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/shared/UserMenu";
import { SwitchCompanyModal } from "@/components/shared/SwitchCompanyModal";
import { EmpresaLabel } from "@/components/shared/EmpresaLabel";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  path: string;
  grupo: "catalogs" | "operation" | "fuel";
  permiso: string | null;
  icon: React.ReactNode;
  disponible?: boolean;
  badge?: string;  // texto del badge (ej: "Nuevo")
}

// ── Items de navegación ───────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  // Catálogos
  {
    id: "units", label: "Unidades",
    path: "/home/catalogs/units", grupo: "catalogs",
    permiso: "unidades.ver", disponible: true,
    icon: <Truck className="h-4 w-4 shrink-0" />,
  },
  {
    id: "clients", label: "Clientes",
    path: "/home/catalogs/clients", grupo: "catalogs",
    permiso: "clientes.ver", disponible: true,
    icon: <Building2 className="h-4 w-4 shrink-0" />,
  },
  {
    id: "operators", label: "Operadores",
    path: "/home/catalogs/operators", grupo: "catalogs",
    permiso: "operadores.ver", disponible: true,
    icon: <Users className="h-4 w-4 shrink-0" />,
  },
  {
    id: "points-of-interest", label: "Puntos de Interés",
    path: "/home/catalogs/points-of-interest", grupo: "catalogs",
    permiso: "pois.ver", disponible: true,
    icon: <MapPinned className="h-4 w-4 shrink-0" />,
  },
  {
    id: "poi-groups", label: "Grupos de POI",
    path: "/home/catalogs/poi-groups", grupo: "catalogs",
    permiso: "pois.ver", disponible: true,
    icon: <FolderOpen className="h-4 w-4 shrink-0" />,
  },
  {
    id: "users", label: "Usuarios",
    path: "/home/catalogs/users", grupo: "catalogs",
    permiso: "usuarios.ver", disponible: true,
    icon: <Users className="h-4 w-4 shrink-0" />,
  },

  // Operación
  {
    id: "monitor", label: "Monitor de Flota",
    path: "/home/operation/monitor", grupo: "operation",
    permiso: "mapa.ver", disponible: true,
    icon: <Map className="h-4 w-4 shrink-0" />,
  },
  {
    id: "routes", label: "Rutas",
    path: "/home/operation/routes", grupo: "operation",
    permiso: "rutas.ver", disponible: true,
    icon: <Route className="h-4 w-4 shrink-0" />,
  },
  {
    id: "itineraries", label: "Itinerarios",
    path: "/home/operation/itineraries", grupo: "operation",
    permiso: "itinerarios.ver", disponible: true,
    icon: <CalendarClock className="h-4 w-4 shrink-0" />,
    badge: "Nuevo",
  },
  {
    id: "aforos", label: "Aforos",
    path: "/home/operation/aforos", grupo: "operation",
    permiso: "aforos.ver", disponible: true,
    icon: <CalendarClock className="h-4 w-4 shrink-0" />,
    badge: "Nuevo",
  },

  // Combustible
  {
    id: "cargas", label: "Carga de Combustible",
    path: "/home/fuel/cargas", grupo: "fuel",
    permiso: "cargas.ver", disponible: true,
    icon: <Fuel className="h-4 w-4 shrink-0" />,
    badge: "Nuevo",
  },
];

// Pre-calcular todas las claves de permiso para usePermisos
const TODAS_LAS_CLAVES = [
  ...new Set(
    NAV_ITEMS
      .map((i) => i.permiso)
      .filter((p): p is string => p !== null),
  ),
];

const GRUPOS_CONFIG = [
  { id: "catalogs", label: "Catálogos", icon: <ClipboardList className="h-4 w-4" /> },
  { id: "operation", label: "Operación", icon: <Map className="h-4 w-4" /> },
  { id: "fuel", label: "Combustible", icon: <Fuel className="h-4 w-4" /> },
] as const;

const ERP_NAV_ITEMS = [
  { id: "erp-empresas", label: "Empresas", path: "/home/admin-erp/empresas", icon: <Building2 className="h-4 w-4 shrink-0" /> },
  { id: "erp-permisos", label: "Permisos", path: "/home/admin-erp/permisos", icon: <ShieldCheck className="h-4 w-4 shrink-0" /> },
  { id: "erp-auditoria", label: "Auditoría", path: "/home/admin-erp/auditoria", icon: <Tag className="h-4 w-4 shrink-0" /> },
];

// Badge "Nuevo" — se muestra solo hasta la fecha de expiración
const NEW_BADGE_EXPIRY = new Date("2026-06-10");
const showNewBadge = () => new Date() < NEW_BADGE_EXPIRY;

// ── Props ─────────────────────────────────────────────────────────────────────

interface HomeNavbarProps {
  onOpenMobileMenu?: () => void;
}

// ── Componente ────────────────────────────────────────────────────────────────

export const HomeNavbar = ({ onOpenMobileMenu }: HomeNavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { currentCompany, fetchCompanies, fetchError } = useCompanyStore();
  const [switchModalOpen, setSwitchModalOpen] = useState(false);

  const permisosActivos = usePermisos(TODAS_LAS_CLAVES);
  const esSudoErp = user?.rol === "sudo_erp";
  const isErpActive = location.pathname.startsWith("/home/admin-erp");

  useEffect(() => {
    if (user && esSudoErp) fetchCompanies();
  }, [user, esSudoErp, fetchCompanies]);

  const itemsVisibles = NAV_ITEMS.filter((item) =>
    item.permiso === null ? true : (permisosActivos[item.permiso] ?? false)
  );

  return (
    <header className="border-b border-slate-200 bg-white">
      {/* Banda indicadora de modo administrador */}
      {esSudoErp && (
        <div className="flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span className="text-center text-[11px] font-medium text-amber-700 sm:text-xs">
            Modo Administrador ERP — tienes acceso total al sistema
          </span>
        </div>
      )}

      <div className="flex min-h-[72px] items-center justify-between gap-3 px-3 md:h-[88px] md:px-6">

        {/* Navegación izquierda */}
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          {/* Botón menú móvil */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Abrir menú de navegación"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">            {/* Grupos de módulos */}
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
                      aria-label={grupo.label}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3 md:px-4",
                        isGroupActive
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-800",
                      )}
                    >
                      {grupo.icon}
                      <span className="hidden sm:inline">{grupo.label}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="start" className="w-[240px] max-w-[85vw]">
                    <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-slate-400">
                      {grupo.label}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {items.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => item.disponible !== false && navigate(item.path)}
                        disabled={item.disponible === false}
                        className={cn(
                          "rounded-md px-3 py-2",
                          item.disponible === false
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer",
                          item.disponible !== false &&
                          location.pathname.startsWith(item.path) &&
                          "bg-sky-50 text-sky-700",
                        )}
                      >
                        <div className="flex w-full items-center gap-3">
                          <span className="text-slate-400">{item.icon}</span>
                          <span className="flex-1 truncate">{item.label}</span>
                          {/* Badge "Nuevo" con expiración automática */}
                          {item.badge && showNewBadge() && (
                            <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-600">
                              {item.badge}
                            </span>
                          )}
                          {item.disponible === false && (
                            <span className="text-[10px] text-slate-400">pronto</span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}

            {/* Panel ERP */}
            {esSudoErp && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Panel ERP"
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3 md:px-4",
                      isErpActive
                        ? "bg-amber-100 text-amber-900"
                        : "border border-amber-200 text-amber-700 hover:bg-amber-50",
                    )}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Panel ERP</span>
                    <ChevronDown className="h-3.5 w-3.5 text-amber-500" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start" className="w-[200px]">
                  <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-slate-400">
                    Administración
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ERP_NAV_ITEMS.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "cursor-pointer rounded-md px-3 py-2",
                        location.pathname === item.path && "bg-amber-50 text-amber-700",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Acciones derecha */}
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          {esSudoErp ? (
            <>
              <button
                onClick={() => setSwitchModalOpen(true)}
                aria-label={
                  fetchError
                    ? "Error al cargar empresa — abrir selector"
                    : `Cambiar empresa: ${currentCompany?.nombre || "cargando"}`
                }
                className={cn(
                  "group flex items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 text-sm font-medium shadow-sm transition-all sm:px-3 md:px-4 md:py-2",
                  fetchError
                    ? "border-red-300 text-red-600 hover:border-red-400 hover:bg-red-50"
                    : "border-blue-300 text-blue-700 hover:border-blue-400 hover:bg-blue-50",
                )}
              >
                <Building2 className={cn("h-4 w-4 shrink-0", fetchError ? "text-red-400" : "text-blue-500")} />
                <span className="hidden max-w-[120px] truncate sm:inline sm:max-w-[180px] lg:max-w-[240px]">
                  {fetchError ? "Error al cargar" : (currentCompany?.nombre || "Cargando...")}
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 shrink-0 transition-transform group-hover:rotate-180",
                  fetchError ? "text-red-400" : "text-blue-500",
                )} />
              </button>
              <SwitchCompanyModal open={switchModalOpen} onOpenChange={setSwitchModalOpen} />
            </>
          ) : (
            <EmpresaLabel nombre={user?.nombre_empresa} />
          )}
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
};