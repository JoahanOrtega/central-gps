export const HomeSidebar = () => {
  return (
    <aside className="w-20 md:w-64 min-h-[calc(100vh-64px)] bg-white border-r p-4">
      <nav className="flex flex-col gap-4 text-gray-600">
        <span>Dashboard</span>
        <span>Catálogos</span>
        <span>Operación</span>
        <span>Combustible</span>
      </nav>
    </aside>
  );
};
