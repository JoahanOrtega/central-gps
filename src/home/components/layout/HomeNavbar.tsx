import { Bell, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHomeNavigation } from "../../hooks/use-home-navigation";

export const HomeNavbar = () => {
  const { navbarItems, activeNavbarItem, setActiveNavbarItem } =
    useHomeNavigation();

  return (
    <header className="h-[88px] border-b border-slate-200 bg-white px-6 flex items-center justify-between">
      <nav className="flex items-center gap-3">
        {navbarItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveNavbarItem(item.id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeNavbarItem === item.id
                ? "bg-slate-100 text-slate-900"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center rounded-lg border border-blue-400 px-4 py-2 text-blue-600 text-sm font-medium">
          SERVICIO INDUSTRIAL AUTOEXPRESS S.A. DE C.V.
        </div>

        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        >
          <Bell className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};
