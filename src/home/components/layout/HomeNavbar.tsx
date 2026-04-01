import {
  Bell,
  ChevronDown,
  FolderOpen,
  Fuel,
  Map,
  Menu,
  Package,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { UserMenu } from "../../../components/shared/UserMenu";

const navbarGroups = [
  {
    id: "catalogs",
    label: "Catálogos",
    icon: <FolderOpen className="h-4 w-4" />,
    items: [
      { id: "units", label: "Unidades", path: "/home/catalogs/units" },
      { id: "clients", label: "Clientes", path: "/home/catalogs/clients" },
      {
        id: "terminals",
        label: "Terminales",
        path: "/home/catalogs/terminals",
      },
      {
        id: "operators",
        label: "Operadores",
        path: "/home/catalogs/operators",
      },
      {
        id: "points-of-interest",
        label: "Puntos de Interés",
        path: "/home/catalogs/points-of-interest",
      },
      {
        id: "gas-stations",
        label: "Gasolineras",
        path: "/home/catalogs/gas-stations",
      },
      { id: "users", label: "Usuarios", path: "/home/catalogs/users" },
    ],
  },
  {
    id: "operation",
    label: "Operación",
    icon: <Map className="h-4 w-4" />,
    items: [
      {
        id: "monitor",
        label: "Monitor de flota",
        path: "/home/operation/monitor",
      },
    ],
  },
  {
    id: "fuel",
    label: "Combustible",
    icon: <Fuel className="h-4 w-4" />,
    items: [{ id: "general", label: "General", path: "/home/fuel/general" }],
  },
];

interface HomeNavbarProps {
  onOpenMobileMenu?: () => void;
}

export const HomeNavbar = ({ onOpenMobileMenu }: HomeNavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex min-h-[72px] items-center justify-between gap-3 px-3 md:h-[88px] md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scrollbar-thin">
            {navbarGroups.map((group) => {
              const isGroupActive = group.items.some((item) =>
                location.pathname.startsWith(item.path),
              );

              return (
                <DropdownMenu key={group.id}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:px-4",
                        isGroupActive
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-800",
                      )}
                    >
                      {group.icon}
                      <span className="hidden sm:inline">{group.label}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="start"
                    className="w-[240px] max-w-[85vw]"
                  >
                    {group.items.map((item) => {
                      const isItemActive = location.pathname === item.path;

                      return (
                        <DropdownMenuItem
                          key={item.id}
                          onClick={() => navigate(item.path)}
                          className={cn(
                            "cursor-pointer rounded-md px-3 py-2",
                            isItemActive && "bg-[#f7f4e8] text-sky-600",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <div className="hidden items-center rounded-lg border border-blue-400 px-4 py-2 text-sm font-medium text-blue-600 xl:flex">
            SERVICIO INDUSTRIAL AUTOEXPRESS S.A. DE C.V.
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 md:h-12 md:w-12"
          >
            <Bell className="h-5 w-5" />
          </button>

          <UserMenu />
        </div>
      </div>
    </header>
  );
};
