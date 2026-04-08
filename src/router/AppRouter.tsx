import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "../auth/pages/LoginPage";
import { PrivateRoute } from "./PrivateRoute";

import { HomeLayout } from "@/layout/HomeLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { MapsPage } from "@/pages/MapsPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { UnitsPage } from "@/pages/UnitsPage";
import { MonitorPage } from "@/pages/MonitorPage";
import { FuelPage } from "@/pages/FuelPage";
import { PointsOfInterestPage } from "@/pages/PointsOfInterestPage";
import { PoiGroupsPage } from "@/pages/PoiGroupsPage";

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