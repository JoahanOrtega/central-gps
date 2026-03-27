import { useState } from "react";
import { Outlet } from "react-router-dom";
import { HomeSidebar } from "../layout/HomeSidebar";
import { HomeNavbar } from "../layout/HomeNavbar";
import { MobileSidebarDrawer } from "../layout/MobileSidebarDrawer";

export const HomeLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    </div>
  );
};
