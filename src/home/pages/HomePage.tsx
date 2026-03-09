import { SummaryCard } from "../components/SummaryCard";

const summaryData = [
  {
    title: "Unidades",
    value: "2",
    description: "Operativas: 1 / No operativas: 1",
  },
  {
    title: "Kilómetros",
    value: "0",
    description: "Sin información disponible",
  },
  {
    title: "Minutos de utilización",
    value: "0",
    description: "En movimiento / Ralentí",
  },
  {
    title: "Excesos de velocidad",
    value: "0",
    description: "Eventos registrados",
  },
];

export const HomePage = () => {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-700">Dashboard</h1>
        <p className="text-gray-500 mt-1">Monitor de flota</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryData.map((item) => (
          <SummaryCard
            key={item.title}
            title={item.title}
            value={item.value}
            description={item.description}
          />
        ))}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6 min-h-[300px]">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Kilómetros recorridos
        </h2>

        <div className="h-52 flex items-center justify-center text-gray-400">
          No hay información para mostrar
        </div>
      </div>
    </section>
  );
};
