import { UnitsCatalogView } from "./UnitsCatalogView";

interface CatalogsViewProps {
  activeItem: string;
}

export const CatalogsView = ({ activeItem }: CatalogsViewProps) => {
  if (activeItem === "units") {
    return <UnitsCatalogView />;
  }

  return (
    <main className="h-full overflow-y-auto bg-[#f5f6f8] p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-2xl font-semibold text-slate-800">Catálogos</h1>
        <p className="mt-2 text-slate-500">Vista activa: {activeItem}</p>
      </section>
    </main>
  );
};