import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "../auth/pages/LoginPage";
import { PrivateRoute } from "./PrivateRoute";

import { HomeLayout } from "../home/components/layout/HomeLayout";
import { DashboardPage } from "../home/pages/DashboardPage";
import { MapsPage } from "../home/pages/MapsPage";
import { ReportsPage } from "../home/pages/ReportsPage";
import { UnitsPage } from "../home/pages/catalogs/UnitsPage";
import { MonitorPage } from "../home/pages/operation/MonitorPage";
import { FuelPage } from "../home/pages/fuel/FuelPage";
import { PointsOfInterestPage } from "@/home/pages/catalogs/PointsOfInterestPage";
import { PoiGroupsPage } from "@/home/pages/catalogs/PoiGroupsPage";

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
        <HomeLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/home/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "maps",
        element: <MapsPage />,
      },
      {
        path: "reports",
        element: <ReportsPage />,
      },
      {
        path: "catalogs/units",
        element: <UnitsPage />,
      },
      {
        path: "operation/monitor",
        element: <MonitorPage />,
      },
      {
        path: "fuel/general",
        element: <FuelPage />,
      }, 
      {
        path: "catalogs/points-of-interest",
        element: <PointsOfInterestPage />,
      },
      {
        path: "catalogs/poi-groups",
        element: <PoiGroupsPage />,
      }
    ],
  },

]);