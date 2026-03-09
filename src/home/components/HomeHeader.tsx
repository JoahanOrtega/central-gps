import { useNavigate } from "react-router-dom";

export const HomeHeader = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header className="h-16 bg-white border-b shadow-sm flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-gray-700">CentralGPS</h1>

      <button
        onClick={handleLogout}
        className="text-sm font-medium text-red-500 hover:text-red-600"
      >
        Salir
      </button>
    </header>
  );
};
