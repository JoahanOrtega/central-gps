import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "../auth/pages/LoginPage";
import { PrivateRoute } from "./PrivateRoute";
import { ErpRoute } from "./ErpRoute";
import { PermisoRoute } from "./PermisoRoute";

import { HomeLayout } from "@/layout/HomeLayout";

// Páginas sistema principal
import { DashboardPage } from "@/pages/DashboardPage";
import { MapsPage } from "@/pages/MapsPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { UnitsPage } from "@/pages/UnitsPage";
import { MonitorPage } from "@/pages/MonitorPage";
import { FuelPage } from "@/pages/FuelPage";
import { PointsOfInterestPage } from "@/pages/PointsOfInterestPage";
import { PoiGroupsPage } from "@/pages/PoiGroupsPage";

// Páginas panel ERP — ahora dentro del HomeLayout
import { EmpresasPage } from "@/features/erp/pages/EmpresasPage";
import { PermisosPage } from "@/features/erp/pages/PermisosPage";
import { AuditoriaPage } from "@/features/erp/pages/AuditoriaPage";

export const appRouter = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },

  // ── Todo dentro del HomeLayout ───────────────────────────
  // Un solo layout para todos los usuarios, el navbar se adapta
  // según el rol mostrando u ocultando módulos y el botón ERP
  {
    path: "/home",
    element: (
      <PrivateRoute>
        <HomeLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/home/dashboard" replace /> },

      // Sistema principal
      {
        path: "dashboard",
        element: <PermisoRoute permiso={null}><DashboardPage /></PermisoRoute>,
      },
      {
        path: "maps",
        element: <PermisoRoute permiso="on"><MapsPage /></PermisoRoute>,
      },
      {
        path: "reports",
        element: <PermisoRoute permiso="crep1"><ReportsPage /></PermisoRoute>,
      },
      {
        path: "catalogs/units",
        element: <PermisoRoute permiso="cund1"><UnitsPage /></PermisoRoute>,
      },
      {
        path: "catalogs/points-of-interest",
        element: <PermisoRoute permiso="cpoi1"><PointsOfInterestPage /></PermisoRoute>,
      },
      {
        path: "catalogs/poi-groups",
        element: <PermisoRoute permiso="cpoi1"><PoiGroupsPage /></PermisoRoute>,
      },
      {
        path: "operation/monitor",
        element: <PermisoRoute permiso="on"><MonitorPage /></PermisoRoute>,
      },
      {
        path: "fuel/general",
        element: <PermisoRoute permiso="cfuel1"><FuelPage /></PermisoRoute>,
      },

      // ── Panel ERP — rutas protegidas con ErpRoute ────────
      // Comparten el HomeLayout pero solo sudo_erp puede entrar.
      // Si un usuario normal intenta acceder por URL es redirigido.
      {
        path: "admin-erp",
        children: [
          { index: true, element: <Navigate to="/home/admin-erp/empresas" replace /> },
          {
            path: "empresas",
            element: <ErpRoute><EmpresasPage /></ErpRoute>,
          },
          {
            path: "permisos",
            element: <ErpRoute><PermisosPage /></ErpRoute>,
          },
          {
            path: "auditoria",
            element: <ErpRoute><AuditoriaPage /></ErpRoute>,
          },
        ],
      },
    ],
  },
]);