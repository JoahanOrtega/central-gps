import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleUserRound, KeyRound, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangePasswordModal } from "@/features/auth/components/ChangePasswordModal";

export const UserMenu = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Estado del modal de cambio de contraseña.
  // Vive aquí (no en un store global) porque el modal es estrictamente
  // local a este menú — no tiene sentido que otra parte de la app
  // pueda abrirlo.
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const displayName = useMemo(() => {
    if (!user?.username) {
      return "Mi perfil";
    }
    return user.username;
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Por qué onSelect en lugar de onClick para "Cambiar contraseña":
  //   onSelect es el evento de Radix dropdown — se dispara antes de
  //   cerrar el menú y permite usar event.preventDefault() si quisieras
  //   mantenerlo abierto. Aquí queremos que cierre y abra el modal,
  //   así que dejamos que ocurra normal y luego abrimos el modal.
  //
  //   Usamos setTimeout(0) para abrir el modal en el siguiente tick:
  //   sin esto, el dropdown intentaría devolver el focus al trigger
  //   al cerrarse y al mismo tiempo el dialog intentaría tomar el focus.
  //   La race condition resulta en focus visible donde no debe estar.
  //   El delay mínimo asegura que primero termine de cerrar el dropdown
  //   y luego el dialog tome el focus limpiamente.
  const handleOpenChangePassword = () => {
    setTimeout(() => setIsChangePasswordOpen(true), 0);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            aria-label="Abrir menú de usuario"
          >
            <CircleUserRound className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-slate-800">{displayName}</p>
            <p className="text-xs text-slate-500">Sesión activa</p>
          </div>

          <DropdownMenuSeparator />

          {/* ── Cambiar contraseña ─────────────────────────────────────────
              Aparece ANTES de "Cerrar sesión" para que las acciones
              destructivas/finales queden al final (Heurística #5:
              prevenir errores — la última opción es la más fácil de
              activar accidentalmente, y "Salir" es la que el usuario
              menos quiere disparar por error). */}
          <DropdownMenuItem
            onClick={handleOpenChangePassword}
            className="cursor-pointer"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Cambiar contraseña
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-rose-600 focus:text-rose-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal montado fuera del dropdown para que su lifecycle no
          dependa del estado abierto/cerrado del menú. Si lo
          montaras dentro de DropdownMenuContent, al cerrar el menú
          también desmontarías el modal en pleno uso. */}
      <ChangePasswordModal
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
      />
    </>
  );
};