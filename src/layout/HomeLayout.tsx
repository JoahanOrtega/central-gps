import { useState } from "react";
import { Outlet } from "react-router-dom";
import { HomeSidebar } from "./HomeSidebar";
import { HomeNavbar } from "./HomeNavbar";
import { MobileSidebarDrawer } from "./MobileSidebarDrawer";
import { usePoiEvents } from "@/hooks/usePoiEvents";
import { PoiEventToastContainer } from "@/features/maps/components/PoiNotifications/PoiEventToast";


export const HomeLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Inicia la conexión SSE de eventos de geocerca en tiempo real.
  // El hook gestiona reconexión automática con backoff exponencial.
  // Se desmonta automáticamente cuando HomeLayout se desmonta (logout).
  usePoiEvents();

  return (
    <div className="h-screen overflow-hidden bg-[#f5f6f8]">
      <div className="flex h-full">
        <div className="hidden md:block">
          <HomeSidebar />
        </div>

        <MobileSidebarDrawer
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <HomeNavbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

          <div className="min-h-0 flex-1 overflow-hidden">
            <Outlet />
          </div>
        </div>
      </div>
      <PoiEventToastContainer />
    </div>
  );
};
