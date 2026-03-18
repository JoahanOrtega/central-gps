import { HomeSidebar } from "./HomeSidebar"
import { HomeNavbar } from "./HomeNavbar"
import { HomeContent } from "./HomeContent"

export const HomeLayout = () => {
  return (
    <section className="grid h-screen w-full grid-cols-[88px_1fr] grid-rows-[88px_1fr] bg-[#f5f6f8]">
      <div className="row-span-2">
        <HomeSidebar />
      </div>

      <div className="col-start-2 row-start-1">
        <HomeNavbar />
      </div>

      <div className="col-start-2 row-start-2 overflow-hidden">
        <HomeContent />
      </div>
    </section>
  )
}