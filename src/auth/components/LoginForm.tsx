import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface LoginFormState {
  username: string;
  password: string;
  remember: boolean;
}

export const LoginForm = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState<LoginFormState>({
    username: "",
    password: "",
    remember: false,
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;

    setForm((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.username.trim() || !form.password.trim()) {
      alert("Captura usuario y contraseña");
      return;
    }

    localStorage.setItem("token", "mock-token");
    navigate("/home");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md flex flex-col gap-4"
    >
      <input
        type="text"
        name="username"
        placeholder="Usuario"
        value={form.username}
        onChange={handleChange}
        className="w-full rounded-full px-5 py-3 bg-white/80 border border-gray-200 outline-none focus:ring-2 focus:ring-sky-500"
      />

      <input
        type="password"
        name="password"
        placeholder="Contraseña"
        value={form.password}
        onChange={handleChange}
        className="w-full rounded-full px-5 py-3 bg-white/80 border border-gray-200 outline-none focus:ring-2 focus:ring-sky-500"
      />

      <label className="flex items-center gap-3 text-gray-700 text-sm">
        <input
          type="checkbox"
          name="remember"
          checked={form.remember}
          onChange={handleChange}
          className="w-4 h-4"
        />
        Recordarme
      </label>

      <button
        type="submit"
        className="mx-auto mt-2 px-8 py-3 rounded-lg bg-sky-700 text-white font-medium hover:bg-sky-800 transition"
      >
        Ingresar
      </button>
    </form>
  );
};
