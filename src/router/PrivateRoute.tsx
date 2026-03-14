import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { hasActiveSession } from "@/auth/utils/auth-storage"

interface PrivateRouteProps {
  children: ReactNode
}

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  if (!hasActiveSession()) {
    return <Navigate to="/login" replace />
  }

  return children
}