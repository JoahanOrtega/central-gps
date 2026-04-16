import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { LoginPage } from "../auth/pages/LoginPage";
import { PrivateRoute } from "./PrivateRoute";
import { ErpRoute } from "./ErpRoute";
import { PermisoRoute } from "./PermisoRoute";
import { HomeLayout } from "@/layout/HomeLayout";

// ── Lazy loading por ruta ─────────────────────────────────────
// Cada página se convierte en un chunk separado que solo se descarga
// cuando el usuario navega a ella — reduce el bundle inicial.
//
// LoginPage y HomeLayout son carga inmediata:
//   - LoginPage → primera pantalla de la app
//   - HomeLayout → shell siempre presente tras el login
//
// El panel ERP es el beneficiario más claro: solo sudo_erp lo usa
// pero sin lazy loading todos los usuarios lo descargaban.

// ── Sistema principal ─────────────────────────────────────────
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const MapsPage = lazy(() => import("@/pages/MapsPage").then(m => ({ default: m.MapsPage })));
const ReportsPage = lazy(() => import("@/pages/ReportsPage").then(m => ({ default: m.ReportsPage })));
const UnitsPage = lazy(() => import("@/pages/UnitsPage").then(m => ({ default: m.UnitsPage })));
const MonitorPage = lazy(() => import("@/pages/MonitorPage").then(m => ({ default: m.MonitorPage })));
const FuelPage = lazy(() => import("@/pages/FuelPage").then(m => ({ default: m.FuelPage })));
const PointsOfInterestPage = lazy(() => import("@/pages/PointsOfInterestPage").then(m => ({ default: m.PointsOfInterestPage })));
const PoiGroupsPage = lazy(() => import("@/pages/PoiGroupsPage").then(m => ({ default: m.PoiGroupsPage })));

// ── Panel ERP — solo sudo_erp los descarga ───────────────────
const EmpresasPage = lazy(() => import("@/features/erp/pages/EmpresasPage").then(m => ({ default: m.EmpresasPage })));
const PermisosPage = lazy(() => import("@/features/erp/pages/PermisosPage").then(m => ({ default: m.PermisosPage })));
const AuditoriaPage = lazy(() => import("@/features/erp/pages/AuditoriaPage").then(m => ({ default: m.AuditoriaPage })));

// ── Fallback de carga ─────────────────────────────────────────
// Se muestra mientras el chunk de la página se descarga.
// Mantiene el layout visible para evitar el flash de pantalla en blanco.
const PageLoader = () => (
  <div className="flex h-full items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
  </div>
);

// ── Wrapper que envuelve cada página lazy con Suspense ────────
// Evita repetir <Suspense fallback={<PageLoader />}> en cada ruta.
const LazyPage = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

export const appRouter = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },

  // ── Todo dentro del HomeLayout ────────────────────────────
  // Un solo layout para todos los usuarios. El navbar se adapta
  // según el rol mostrando u ocultando módulos y el botón ERP.
  {
    path: "/home",
    element: (
      <PrivateRoute>
        <HomeLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/home/dashboard" replace /> },

      // ── Sistema principal ───────────────────────────────────
      {
        path: "dashboard",
        element: <PermisoRoute permiso={null}><LazyPage><DashboardPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "maps",
        element: <PermisoRoute permiso="on"><LazyPage><MapsPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "reports",
        element: <PermisoRoute permiso="crep1"><LazyPage><ReportsPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "catalogs/units",
        element: <PermisoRoute permiso="cund1"><LazyPage><UnitsPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "catalogs/points-of-interest",
        element: <PermisoRoute permiso="cpoi1"><LazyPage><PointsOfInterestPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "catalogs/poi-groups",
        element: <PermisoRoute permiso="cpoi1"><LazyPage><PoiGroupsPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "operation/monitor",
        element: <PermisoRoute permiso="on"><LazyPage><MonitorPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "fuel/general",
        element: <PermisoRoute permiso="cfuel1"><LazyPage><FuelPage /></LazyPage></PermisoRoute>,
      },

      // ── Panel ERP — rutas protegidas con ErpRoute ──────────
      // Comparten el HomeLayout pero solo sudo_erp puede entrar.
      // Si un usuario normal intenta acceder por URL es redirigido.
      {
        path: "admin-erp",
        children: [
          { index: true, element: <Navigate to="/home/admin-erp/empresas" replace /> },
          {
            path: "empresas",
            element: <ErpRoute><LazyPage><EmpresasPage /></LazyPage></ErpRoute>,
          },
          {
            path: "permisos",
            element: <ErpRoute><LazyPage><PermisosPage /></LazyPage></ErpRoute>,
          },
          {
            path: "auditoria",
            element: <ErpRoute><LazyPage><AuditoriaPage /></LazyPage></ErpRoute>,
          },
        ],
      },
    ],
  },
]);