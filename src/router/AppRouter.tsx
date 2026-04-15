// src/router/AppRouter.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "../auth/pages/LoginPage";
import { PrivateRoute } from "./PrivateRoute";
import { ErpRoute } from "./ErpRoute";               // ← NUEVO

import { HomeLayout } from "@/layout/HomeLayout";
import { ErpLayout } from "@/features/erp/pages/ErpLayout";   // ← NUEVO

// Páginas del sistema principal (sin cambios)
import { DashboardPage } from "@/pages/DashboardPage";
import { MapsPage } from "@/pages/MapsPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { UnitsPage } from "@/pages/UnitsPage";
import { MonitorPage } from "@/pages/MonitorPage";
import { FuelPage } from "@/pages/FuelPage";
import { PointsOfInterestPage } from "@/pages/PointsOfInterestPage";
import { PoiGroupsPage } from "@/pages/PoiGroupsPage";

// Páginas del panel ERP (nuevas)
import { EmpresasPage } from "@/features/erp/pages/EmpresasPage";
import { PermisosPage } from "@/features/erp/pages/PermisosPage";
import { AuditoriaPage } from "@/features/erp/pages/AuditoriaPage";

export const appRouter = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },

  // ── Sistema principal ────────────────────────────────
  {
    path: "/home",
    element: (
      <PrivateRoute>
        <HomeLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/home/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "maps", element: <MapsPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "catalogs/units", element: <UnitsPage /> },
      { path: "operation/monitor", element: <MonitorPage /> },
      { path: "fuel/general", element: <FuelPage /> },
      { path: "catalogs/points-of-interest", element: <PointsOfInterestPage /> },
      { path: "catalogs/poi-groups", element: <PoiGroupsPage /> },
    ],
  },

  // ── Panel Admin ERP ──────────────────────────────────
  // Ruta protegida: solo accesible con rol sudo_erp
  {
    path: "/admin-erp",
    element: (
      <ErpRoute>
        <ErpLayout />
      </ErpRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin-erp/empresas" replace /> },
      { path: "empresas", element: <EmpresasPage /> },
      { path: "permisos", element: <PermisosPage /> },
      { path: "auditoria", element: <AuditoriaPage /> },
    ],
  },
]);