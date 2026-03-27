const API_URL = import.meta.env.VITE_API_URL;

export const apiFetch = async (endpoint: string, options?: RequestInit) => {
  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error en la petición");
  }

  return data;
};
