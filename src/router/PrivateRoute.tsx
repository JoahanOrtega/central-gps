import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStoredToken } from "@/auth/utils/auth-storage";

interface PrivateRouteProps {
  children: ReactNode;
}

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const location = useLocation();
  const token = getStoredToken();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
