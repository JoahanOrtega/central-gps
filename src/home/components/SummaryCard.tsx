interface SummaryCardProps {
  title: string;
  value: string;
  description: string;
}

export const SummaryCard = ({
  title,
  value,
  description,
}: SummaryCardProps) => {
  return (
    <article className="bg-white rounded-2xl border shadow-sm p-5">
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      <p className="text-4xl font-bold text-sky-600 mt-4">{value}</p>
      <p className="text-sm text-gray-500 mt-2">{description}</p>
    </article>
  );
};
