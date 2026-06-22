import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { LoginPage } from "../auth/pages/LoginPage";
import { PrivateRoute } from "./PrivateRoute";
import { ErpRoute } from "./ErpRoute";
import { PermisoRoute } from "./PermisoRoute";
import { HomeLayout } from "@/layout/HomeLayout";

// Cada página lazy es un chunk aparte que solo se descarga al navegar a ella,
// para no inflar el bundle inicial. LoginPage y HomeLayout van en carga directa
// porque son el primer render y el shell siempre presente tras el login.

const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const MapsPage = lazy(() => import("@/features/maps/pages/MapsPage").then(m => ({ default: m.MapsPage })));
const ReportsPage = lazy(() => import("@/features/reports/pages/ReportsPage").then(m => ({ default: m.ReportsPage })));
const UnitsPage = lazy(() => import("@/features/catalogs/units/pages/UnitsPage").then(m => ({ default: m.UnitsPage })));
const MonitorPage = lazy(() => import("@/features/operation/pages/MonitorPage").then(m => ({ default: m.MonitorPage })));
const FuelPage = lazy(() => import("@/features/fuel/pages/FuelPage").then(m => ({ default: m.FuelPage })));
const PointsOfInterestPage = lazy(() => import("@/features/catalogs/pois/pages/PointsOfInterestPage").then(m => ({ default: m.PointsOfInterestPage })));
const PoiGroupsPage = lazy(() => import("@/features/catalogs/pois/pages/PoiGroupsPage").then(m => ({ default: m.PoiGroupsPage })));
const ClientsPage = lazy(() => import("@/features/catalogs/clients/pages/ClientsPage").then(m => ({ default: m.ClientsPage })));
const OperatorsPage = lazy(() => import("@/features/catalogs/operators/pages/OperatorsPage").then(m => ({ default: m.OperatorsPage })));
const RoutesPage = lazy(() => import("@/features/operation/routes/pages/RoutesPage").then(m => ({ default: m.RoutesPage })));
const ItinerariesPage = lazy(() => import("@/features/operation/itineraries/pages/ItinerariesPage").then(m => ({ default: m.ItinerariesPage })));
const UsersPage = lazy(() => import("@/features/catalogs/users/pages/UsersPage").then(m => ({ default: m.UsersPage })));
const PublicUnitTrackPage = lazy(() => import("@/features/public-track/pages/PublicUnitTrackPage").then(m => ({ default: m.PublicUnitTrackPage })));

// El panel ERP solo lo descarga sudo_erp.
const EmpresasPage = lazy(() => import("@/features/erp/pages/EmpresasPage").then(m => ({ default: m.EmpresasPage })));
const PermisosPage = lazy(() => import("@/features/erp/pages/PermisosPage").then(m => ({ default: m.PermisosPage })));
const AuditoriaPage = lazy(() => import("@/features/erp/pages/AuditoriaPage").then(m => ({ default: m.AuditoriaPage })));

const PageLoader = ({ name }: { name: string }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
    <span className="text-sm text-slate-400">Cargando {name}...</span>
  </div>
);

// Envuelve cada página lazy en Suspense con un loader que nombra el módulo.
const LazyPage = ({
  children,
  name,
}: {
  children: React.ReactNode;
  name: string;
}) => (
  <Suspense fallback={<PageLoader name={name} />}>{children}</Suspense>
);

// En móvil arranca en el mapa y en escritorio, en el dashboard.
const HomeIndexRedirect = () => {
  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches;

  return (
    <Navigate
      to={isMobile ? "/home/maps" : "/home/dashboard"}
      replace
    />
  );
}

export const appRouter = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },

  // Rastreo público por token: sin PrivateRoute, el token es la credencial.
  {
    path: "/track/unit/:token",
    element: (
      <LazyPage name="Rastreo">
        <PublicUnitTrackPage />
      </LazyPage>
    ),
  },

  // Todo bajo HomeLayout exige login (PrivateRoute).
  {
    path: "/home",
    element: (
      <PrivateRoute>
        <HomeLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <HomeIndexRedirect /> },

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
        path: "catalogs/operators",
        element: <PermisoRoute permiso="operadores.ver"><LazyPage name="Operadores"><OperatorsPage /></LazyPage></PermisoRoute>,
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
        path: "operation/itineraries",
        element: <PermisoRoute permiso="itinerarios.ver"><LazyPage name="Itinerarios"><ItinerariesPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "operation/routes",
        element: <PermisoRoute permiso="rutas.ver"><LazyPage name="Rutas"><RoutesPage /></LazyPage></PermisoRoute>,
      },
      {
        path: "fuel/general",
        element: <PermisoRoute permiso="cargas.ver"><LazyPage name="Combustible"><FuelPage /></LazyPage></PermisoRoute>,
      },

      // ErpRoute verifica el rol sudo_erp antes de dar acceso.
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