/**
 * Envuelve el contenido en el fondo gris + card blanca redondeada
 * que usan PointsOfInterestView, UnitsCatalogView, UsersCatalogView
 * y ClientsCatalogView.
 */
export const CatalogLayout = ({ children }: { children: React.ReactNode }) => (
  <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
    <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {children}
    </section>
  </main>
);