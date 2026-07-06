import { useMemo, useState } from "react";
import { Route as RouteIcon } from "lucide-react";
import { routeService } from "../services/routeService";
import type { CreateRoutePayload, Logistica, TipoRuta } from "../types/route.types";
import { useEmpresaActiva } from "@/hooks/useEmpresaActiva";
import { notify } from "@/stores/notificationStore";
import { ModalWithTabs } from "@/components/shared/ModalWithTabs";
import { RouteInfoTab } from "./tabs/RouteInfoTab";
import { RouteLogisticaTab } from "./tabs/RouteLogisticaTab";

interface NewRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Una logística vacía para inicializar cada sentido de la ruta
const emptyLogistica = (tipo: 1 | 2): Logistica => ({
  tipo_logistica: tipo,
  direccion_inicio: "",
  direccion_fin: "",
  fecha_inicio: null,
  tiempo_recorrido_min: null,
  kilometros: null,
  path: [],
  paradas: [],
});

interface RouteForm {
  clave: string;
  nombre: string;
  tipo: TipoRuta | "";
  id_cliente: number | null;
  observaciones: string;
  id_grupo_rutas: number[];
  // Si la ruta tiene vuelta (segunda logística) o solo ida
  tieneVuelta: boolean;
  logisticaAB: Logistica;
  logisticaBA: Logistica;
}

const EMPTY_FORM: RouteForm = {
  clave: "",
  nombre: "",
  tipo: "",
  id_cliente: null,
  observaciones: "",
  id_grupo_rutas: [],
  tieneVuelta: false,
  logisticaAB: emptyLogistica(1),
  logisticaBA: emptyLogistica(2),
};

export const NewRouteModal = ({
  open,
  onOpenChange,
  onSuccess,
}: NewRouteModalProps) => {
  const { idEmpresa } = useEmpresaActiva();

  const [form, setForm] = useState<RouteForm>(EMPTY_FORM);
  const [error, setError] = useState("");
  // Errores de validación por campo (solo creación los usa hoy). Opcional: los modales que no validan por campo simplemente no la pasan.
  const [fieldErrors, setFieldErrors] = useState<{ nombre?: string; tipo?: string }>({});
  const [activeTab, setActiveTab] = useState("info");
  const [isLoading, setIsLoading] = useState(false);

  // Detectar si hay cambios sin guardar para mostrar confirmación al cerrar
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(EMPTY_FORM),
    [form],
  );

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setError("");
    setFieldErrors({});
    setActiveTab("info");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) handleReset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    setError("");
    setFieldErrors({});

    // Validación de campos obligatorios
    const nuevosErrores: { nombre?: string; tipo?: string } = {};
    if (!form.nombre.trim()) nuevosErrores.nombre = "El nombre de la ruta es requerido";
    if (!form.tipo) nuevosErrores.tipo = "Selecciona el tipo de ruta";
    if (nuevosErrores.nombre || nuevosErrores.tipo) {
      setFieldErrors(nuevosErrores);
      setActiveTab("info");
      return;
    }
    // Validación de la logística de entrada 
    if (!form.tipo) return;
    if (form.logisticaAB.path.length === 0) {
      setError("La logística de entrada necesita un trazo. Súbelo desde un KML o dibújalo en el mapa.");
      setActiveTab("logistica-ab");
      return;
    }

    // Armar las logísticas a enviar (1 o 2 según tieneVuelta)
    const logisticas: Logistica[] = [form.logisticaAB];
    if (form.tieneVuelta && form.logisticaBA.path.length > 0) {
      logisticas.push(form.logisticaBA);
    }

    const payload: CreateRoutePayload = {
      clave: form.clave.trim(),
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      id_cliente: form.id_cliente,
      observaciones: form.observaciones.trim() || null,
      id_grupo_rutas: form.id_grupo_rutas,
      id_empresa: idEmpresa ?? undefined,
      logisticas,
    };

    setIsLoading(true);
    try {
      await routeService.create(payload);
      notify.success(`Ruta "${form.nombre}" creada correctamente`);
      onSuccess();
      handleOpenChange(false);
    } catch (err) {
      if (err instanceof Error && err.message.includes("CLAVE_TAKEN")) {
        setError("Ya existe una ruta con esa clave en tu empresa");
        setActiveTab("info");
        return;
      }
      setError(err instanceof Error ? err.message : "No fue posible crear la ruta");
    } finally {
      setIsLoading(false);
    }
  };

  // Tabs: Info General siempre; Logística de entrada siempre; salida solo si aplica
  const tabs = [
    {
      id: "info",
      label: "Info. General",
      content: (
        <RouteInfoTab
          form={form} fieldErrors={fieldErrors}
          onChange={(patch) => {
            setForm((prev) => ({ ...prev, ...patch }));
            // Al corregir un campo con error, su mensaje desaparece al instante.
            setFieldErrors((prev) => {
              const next = { ...prev };
              if ("nombre" in patch) delete next.nombre;
              if ("tipo" in patch) delete next.tipo;
              return next;
            });
          }}
        />
      ),
    },
    {
      id: "logistica-ab",
      label: "Logística de entrada",
      content: (
        <RouteLogisticaTab
          logistica={form.logisticaAB}
          onChange={(log) => setForm((prev) => ({ ...prev, logisticaAB: log }))}
        />
      ),
    },
    ...(form.tieneVuelta
      ? [{
        id: "logistica-ba",
        label: "Logística de salida",
        content: (
          <RouteLogisticaTab
            logistica={form.logisticaBA}
            onChange={(log) => setForm((prev) => ({ ...prev, logisticaBA: log }))}
          />
        ),
      }]
      : []),
  ];

  return (
    <ModalWithTabs
      open={open}
      onOpenChange={handleOpenChange}
      title="Nueva Ruta"
      icon={RouteIcon}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSave={handleSubmit}
      onReset={handleReset}
      isLoading={isLoading}
      error={error}
      confirmCloseDescription="Al cerrar, perderás la información capturada. ¿Deseas cerrar el formulario?"
      hasUnsavedChanges={hasUnsavedChanges}
    />
  );
};