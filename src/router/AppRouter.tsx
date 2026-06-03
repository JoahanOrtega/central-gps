import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { LoginPage } from "../auth/pages/LoginPage";
import { PrivateRoute } from "./PrivateRoute";
import { ErpRoute } from "./ErpRoute";
import { PermisoRoute } from "./PermisoRoute";
import { HomeLayout } from "@/layout/HomeLayout";

// Lazy loading por ruta
// Cada página se convierte en un chunk separado que solo se descarga
// cuando el usuario navega a ella reduce el bundle inicial.
//
// LoginPage y HomeLayout son carga inmediata:
//   - LoginPage → primera pantalla de la app
//   - HomeLayout → shell siempre presente tras el login

// Sistema principal
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const MapsPage = lazy(() => import("@/pages/MapsPage").then(m => ({ default: m.MapsPage })));
const ReportsPage = lazy(() => import("@/pages/ReportsPage").then(m => ({ default: m.ReportsPage })));
const UnitsPage = lazy(() => import("@/pages/UnitsPage").then(m => ({ default: m.UnitsPage })));
const MonitorPage = lazy(() => import("@/pages/MonitorPage").then(m => ({ default: m.MonitorPage })));
const FuelPage = lazy(() => import("@/pages/FuelPage").then(m => ({ default: m.FuelPage })));
const PointsOfInterestPage = lazy(() => import("@/pages/PointsOfInterestPage").then(m => ({ default: m.PointsOfInterestPage })));
const PoiGroupsPage = lazy(() => import("@/pages/PoiGroupsPage").then(m => ({ default: m.PoiGroupsPage })));
const UsersPage = lazy(() => import("@/features/catalogs/users/pages/UsersPage").then(m => ({ default: m.UsersPage })));
const ClientsPage = lazy(() => import("@/pages/ClientsPage").then(m => ({ default: m.ClientsPage })));
const RoutesPage = lazy(() => import("@/pages/RoutesPage").then(m => ({ default: m.RoutesPage })));

// Panel ERP — solo sudo_erp lo descarga
const EmpresasPage = lazy(() => import("@/features/erp/pages/EmpresasPage").then(m => ({ default: m.EmpresasPage })));
const PermisosPage = lazy(() => import("@/features/erp/pages/PermisosPage").then(m => ({ default: m.PermisosPage })));
const AuditoriaPage = lazy(() => import("@/features/erp/pages/AuditoriaPage").then(m => ({ default: m.AuditoriaPage })));

// Loader de página con nombre del módulo
const PageLoader = ({ name }: { name: string }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
    <span className="text-sm text-slate-400">Cargando {name}...</span>
  </div>
);

// Wrapper que envuelve cada página lazy con Suspense y un loader específico
const LazyPage = ({
  children,
  name,
}: {
  children: React.ReactNode;
  name: string;
}) => (
  <Suspense fallback={<PageLoader name={name} />}>{children}</Suspense>
);

export const appRouter = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },

  // Todo dentro del HomeLayout, protegido por PrivateRoute (requiere login).
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
        element: <PermisoRoute permiso={null}><LazyPage name="Dashboard"><DashboardPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "maps",
        element: <PermisoRoute permiso="mapa.ver"><LazyPage name="Mapa"><MapsPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "reports",
        element: <PermisoRoute permiso="reportes.ver"><LazyPage name="Reportes"><ReportsPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "catalogs/units",
        element: <PermisoRoute permiso="unidades.ver"><LazyPage name="Unidades"><UnitsPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "catalogs/clients",
        element: <PermisoRoute permiso="clientes.ver"><LazyPage name="Clientes"><ClientsPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "catalogs/points-of-interest",
        element: <PermisoRoute permiso="pois.ver"><LazyPage name="Puntos de Interés"><PointsOfInterestPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "catalogs/poi-groups",
        element: <PermisoRoute permiso="pois.ver"><LazyPage name="Grupos de POI"><PoiGroupsPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "catalogs/users",
        element: <PermisoRoute permiso="usuarios.ver"><LazyPage name="Usuarios"><UsersPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "operation/monitor",
        element: <PermisoRoute permiso="mapa.ver"><LazyPage name="Monitor de Flota"><MonitorPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "operation/routes",
        element: <PermisoRoute permiso="rutas.ver"><LazyPage name="Rutas"><RoutesPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "fuel/general",
        element: <PermisoRoute permiso="cargas.ver"><LazyPage name="Combustible"><FuelPage /></LazyPage></PermisoRoute>,
      },

      // Panel ERP — rutas protegidas con ErpRoute que verifica sudo_erp
      {
        path: "admin-erp",
        children: [
          { index: true, element: <Navigate to="/home/admin-erp/empresas" replace /> },
          {
            path: "empresas",
            element: <ErpRoute><LazyPage name="Empresas"><EmpresasPage /></LazyPage></ErpRoute>,
          },
          {
            path: "permisos",
            element: <ErpRoute><LazyPage name="Permisos"><PermisosPage /></LazyPage></ErpRoute>,
          },
          {
            path: "auditoria",
            element: <ErpRoute><LazyPage name="Auditoría"><AuditoriaPage /></LazyPage></ErpRoute>,
          },
        ],
      },
    ],
  },
]);