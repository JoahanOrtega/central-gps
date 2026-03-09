interface OperationViewProps {
  activeItem: string;
}

export const OperationView = ({ activeItem }: OperationViewProps) => {
  return (
    <main className="h-full overflow-y-auto p-6 bg-[#f5f6f8]">
      <section className="rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-2xl font-semibold text-slate-800">Operación</h1>
        <p className="mt-2 text-slate-500">Vista activa: {activeItem}</p>
      </section>
    </main>
  );
};
