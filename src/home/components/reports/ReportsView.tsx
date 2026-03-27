interface ReportsViewProps {
  activeItem: string;
}

export const ReportsView = ({ activeItem }: ReportsViewProps) => {
  return (
    <main className="h-full overflow-auto bg-[#f5f6f8] p-3 md:p-6">
      <section className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <h1 className="text-2xl font-semibold text-slate-800">Reportes</h1>
        <p className="mt-2 text-slate-500">Vista activa: {activeItem}</p>
      </section>
    </main>
  );
};
