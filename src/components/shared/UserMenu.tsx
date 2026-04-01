import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { CircleUserRound, LogOut } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  clearAuthSession,
  getStoredAuthUser,
} from "@/auth/utils/auth-storage"

export const UserMenu = () => {
  const navigate = useNavigate()
  const user = getStoredAuthUser()

  const displayName = useMemo(() => {
    if (!user?.username) {
      return "Mi perfil"
    }

    return user.username
  }, [user])

  const handleLogout = () => {
    clearAuthSession()
    navigate("/login", { replace: true })
  }

  return (
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

        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-rose-600 focus:text-rose-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}