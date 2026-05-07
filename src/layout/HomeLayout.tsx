import { useState } from "react";
import { Outlet } from "react-router-dom";
import { HomeSidebar } from "./HomeSidebar";
import { HomeNavbar } from "./HomeNavbar";
import { MobileSidebarDrawer } from "./MobileSidebarDrawer";
import { usePoiEvents } from "@/hooks/usePoiEvents";
import { PoiEventToastContainer } from "@/features/maps/components/PoiNotifications/PoiEventToast";
import { PageTransition } from "@/components/shared/PageTransition";


export const HomeLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
            {/* PageTransition: fade-in + translateY(8px→0) en 180ms.
                key={pathname} fuerza remount en cada navegación,
                disparando la animación de entrada. */}
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </div>
      </div>
      <PoiEventToastContainer />
    </div>
  );
};