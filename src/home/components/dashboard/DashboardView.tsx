import { Bus, CalendarDays, Download, Expand } from "lucide-react";

export const DashboardView = () => {
  return (
    <main className="h-full overflow-y-auto p-6 bg-[#f5f6f8]">
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <Bus className="h-5 w-5 text-slate-500" />
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">
                Dashboard
              </h1>
              <p className="text-sm text-slate-500">Monitor de flota</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <CalendarDays className="h-4 w-4" />
              Hoy 9 mar. 2026
            </button>

            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50">
              <Download className="h-4 w-4" />
            </button>

            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50">
              <Expand className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 border-b border-slate-200">
          <article className="p-6 border-r border-slate-200">
            <h2 className="text-2xl font-semibold text-blue-600">Unidades</h2>
            <div className="mt-6 space-y-4 text-slate-700">
              <div className="flex justify-between">
                <span>Todas</span>
                <span className="font-semibold text-sky-500">2</span>
              </div>
              <div className="flex justify-between">
                <span>Operativas</span>
                <span className="font-semibold text-emerald-500">1</span>
              </div>
              <div className="flex justify-between">
                <span>No operativas</span>
                <span className="font-semibold text-rose-500">1</span>
              </div>
            </div>
          </article>

          <article className="p-6 border-r border-slate-200">
            <h2 className="text-2xl font-semibold text-slate-700">
              Kilómetros
            </h2>
            <div className="mt-6 space-y-4 text-slate-700">
              <div className="flex justify-between">
                <span>Recorridos</span>
                <span className="font-semibold text-sky-500">0</span>
              </div>
              <div className="flex justify-between">
                <span>Unidades con kms.</span>
                <span className="font-semibold text-emerald-500">0</span>
              </div>
              <div className="flex justify-between">
                <span>Unidades sin kms.</span>
                <span className="font-semibold text-sky-500">2</span>
              </div>
            </div>
          </article>

          <article className="p-6 border-r border-slate-200">
            <h2 className="text-2xl font-semibold text-emerald-500">
              Minutos de utilización
            </h2>
            <div className="mt-6 space-y-4 text-slate-700">
              <div className="flex justify-between">
                <span>En movimiento</span>
                <span className="font-semibold text-emerald-500">0</span>
              </div>
              <div className="flex justify-between">
                <span>En ralentí</span>
                <span className="font-semibold text-sky-500">0</span>
              </div>
              <div className="flex justify-between">
                <span>De inactividad</span>
                <span className="font-semibold text-slate-700">0</span>
              </div>
            </div>
          </article>

          <article className="p-6">
            <h2 className="text-2xl font-semibold text-rose-500">
              Excesos de velocidad
            </h2>
            <div className="mt-6 space-y-4 text-slate-700">
              <div className="flex justify-between">
                <span>Eventos</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between">
                <span>Minutos</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between">
                <span>Unidades</span>
                <span className="font-semibold">0</span>
              </div>
            </div>
          </article>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-slate-700">
              Kilómetros recorridos
            </h3>
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Ver Top 10
            </button>
          </div>

          <div className="mt-8 flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
            No hay información para mostrar
          </div>
        </div>
      </section>
    </main>
  );
};
