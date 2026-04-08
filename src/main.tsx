import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { appRouter } from "./router/AppRouter";
import { NotificationToast } from '@/components/shared/NotificationToast';
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <NotificationToast />
    <RouterProvider router={appRouter} />
  </React.StrictMode>,
);
