import { Bell, ChevronDown, FolderOpen, Fuel, Map, Package } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useHomeNavigation } from "../../hooks/use-home-navigation";
import { UserMenu } from "../shared/UserMenu";
import type { NavbarSection } from "../../types/home.types";

const groupIcons: Record<NavbarSection, React.ReactNode> = {
  catalogs: <FolderOpen className="h-4 w-4" />,
  operation: <Map className="h-4 w-4" />,
  fuel: <Fuel className="h-4 w-4" />,
};

const itemIcons: Record<string, React.ReactNode> = {
  units: <Package className="h-4 w-4" />,
  clients: <Package className="h-4 w-4" />,
  terminals: <Package className="h-4 w-4" />,
  operators: <Package className="h-4 w-4" />,
  "interest-points": <Package className="h-4 w-4" />,
  "gas-stations": <Package className="h-4 w-4" />,
  users: <Package className="h-4 w-4" />,
  monitor: <Map className="h-4 w-4" />,
  general: <Fuel className="h-4 w-4" />,
};

export const HomeNavbar = () => {
  const {
    activeNavbarSection,
    activeNavbarItem,
    navbarGroups,
    setActiveNavbarItem,
  } = useHomeNavigation();

  return (
    <header className="flex h-[88px] items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        {navbarGroups.map((group) => {
          const isGroupActive = activeNavbarSection === group.id;

          return (
            <DropdownMenu key={group.id}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    isGroupActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800",
                  )}
                >
                  {groupIcons[group.id]}
                  <span>{group.label}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" className="w-60">
                {group.items.map((item) => {
                  const isItemActive =
                    activeNavbarSection === group.id && activeNavbarItem === item.id;

                  return (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => setActiveNavbarItem(group.id, item.id)}
                      className={cn(
                        "cursor-pointer rounded-md px-3 py-2",
                        isItemActive && "bg-[#f7f4e8] text-sky-600",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {itemIcons[item.id] ?? <Package className="h-4 w-4" />}
                        <span>{item.label}</span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center rounded-lg border border-blue-400 px-4 py-2 text-sm font-medium text-blue-600 md:flex">
          SERVICIO INDUSTRIAL AUTOEXPRESS S.A. DE C.V.
        </div>

        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        >
          <Bell className="h-5 w-5" />
        </button>

        <UserMenu />
      </div>
    </header>
  );
};