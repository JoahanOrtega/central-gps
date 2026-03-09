import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "../auth/pages/LoginPage";
import { HomePage } from "../home/pages/HomePage";
import { PrivateRoute } from "./PrivateRoute";

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/home",
    element: (
      <PrivateRoute>
        <HomePage />
      </PrivateRoute>
    ),
  },
]);
