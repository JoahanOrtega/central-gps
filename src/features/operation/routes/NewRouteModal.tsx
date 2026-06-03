import { useState } from "react";
import { Route as RouteIcon } from "lucide-react";
import { routeService } from "./routeService";
import type { CreateRoutePayload, Logistica, TipoRuta } from "./route.types";
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
  tipo_logistica:       tipo,
  direccion_inicio:     "",
  direccion_fin:        "",
  fecha_inicio:         null,
  tiempo_recorrido_min: null,
  kilometros:           null,
  path:                 [],
  paradas:              [],
});

interface RouteForm {
  clave:          string;
  nombre:         string;
  tipo:           TipoRuta | "";
  id_cliente:     number | null;
  observaciones:  string;
  id_grupo_rutas: number[];
  // Si la ruta tiene vuelta (segunda logística) o solo ida
  tieneVuelta:    boolean;
  logisticaAB:    Logistica;
  logisticaBA:    Logistica;
}

const EMPTY_FORM: RouteForm = {
  clave:          "",
  nombre:         "",
  tipo:           "",
  id_cliente:     null,
  observaciones:  "",
  id_grupo_rutas: [],
  tieneVuelta:    false,
  logisticaAB:    emptyLogistica(1),
  logisticaBA:    emptyLogistica(2),
};

export const NewRouteModal = ({
  open,
  onOpenChange,
  onSuccess,
}: NewRouteModalProps) => {
  const { idEmpresa } = useEmpresaActiva();

  const [form, setForm]           = useState<RouteForm>(EMPTY_FORM);
  const [error, setError]         = useState("");
  const [activeTab, setActiveTab] = useState("info");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setError("");
    setActiveTab("info");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) handleReset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    setError("");

    // Validaciones básicas — saltan al tab donde está el problema
    if (!form.nombre.trim()) {
      setError("El nombre de la ruta es requerido");
      setActiveTab("info");
      return;
    }
    if (!form.tipo) {
      setError("Selecciona el tipo de ruta");
      setActiveTab("info");
      return;
    }
    if (form.logisticaAB.path.length === 0) {
      setError("La logística de ida (A-B) necesita un trazo. Súbelo desde un KML o dibújalo en el mapa.");
      setActiveTab("logistica-ab");
      return;
    }

    // Armar las logísticas a enviar (1 o 2 según tieneVuelta)
    const logisticas: Logistica[] = [form.logisticaAB];
    if (form.tieneVuelta && form.logisticaBA.path.length > 0) {
      logisticas.push(form.logisticaBA);
    }

    const payload: CreateRoutePayload = {
      clave:          form.clave.trim(),
      nombre:         form.nombre.trim(),
      tipo:           form.tipo,
      id_cliente:     form.id_cliente,
      observaciones:  form.observaciones.trim() || null,
      id_grupo_rutas: form.id_grupo_rutas,
      id_empresa:     idEmpresa ?? undefined,
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

  // Tabs: Info General siempre; Logística A-B siempre; B-A solo si tiene vuelta
  const tabs = [
    {
      id: "info",
      label: "Info. General",
      content: (
        <RouteInfoTab
          form={form}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        />
      ),
    },
    {
      id: "logistica-ab",
      label: "Logística A-B (Entrada)",
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
          label: "Logística B-A (Salida)",
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
    />
  );
};