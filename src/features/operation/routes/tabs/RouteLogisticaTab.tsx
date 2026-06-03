import { useRef, useState } from "react";
import { Upload, MapPin, Trash2, Crosshair } from "lucide-react";
import type { Logistica, Parada, LatLng } from "../route.types";
import { parseKmlRoute } from "../kml";
import { notify } from "@/stores/notificationStore";
import { Field, inputClass } from "@/components/shared/form-helpers";
import { RouteTraceMap, type RouteTraceMapHandle } from "../RouteTraceMap";

interface RouteLogisticaTabProps {
  logistica: Logistica;
  onChange:  (logistica: Logistica) => void;
}

type SubTab = "datos" | "paradas" | "nueva";

export const RouteLogisticaTab = ({ logistica, onChange }: RouteLogisticaTabProps) => {
  const [subTab, setSubTab] = useState<SubTab>("datos");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mapRef       = useRef<RouteTraceMapHandle | null>(null);

  // Parada pendiente de ubicar con click en el mapa (modo colocación)
  const [placingParada, setPlacingParada] = useState<number | null>(null);

  // Subir KML
  const handleKmlSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = parseKmlRoute(text);
      result.warnings.forEach((w) => notify.info(w));

      if (result.trace.length === 0 && result.waypoints.length === 0) {
        notify.error("El archivo KML no contiene ni trazo ni paradas válidas.");
        return;
      }

      onChange({
        ...logistica,
        path: result.trace,
        paradas: result.waypoints.map((p, i) => ({ ...p, numero: i + 1 })),
      });
      notify.success(
        `KML importado: ${result.trace.length} puntos de trazo y ${result.waypoints.length} paradas.`,
      );
      setSubTab("paradas");
    } catch {
      notify.error("No se pudo leer el archivo KML.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Paradas
  const updateParada = (numero: number, patch: Partial<Parada>) => {
    onChange({
      ...logistica,
      paradas: logistica.paradas.map((p) =>
        p.numero === numero ? { ...p, ...patch } : p,
      ),
    });
  };

  const removeParada = (numero: number) => {
    const filtered = logistica.paradas
      .filter((p) => p.numero !== numero)
      .map((p, i) => ({ ...p, numero: i + 1 }));
    onChange({ ...logistica, paradas: filtered });
    if (placingParada === numero) setPlacingParada(null);
  };

  // Agregar parada: intenta geocodificar la dirección; si no hay, pide click en mapa
  const handleAddParada = async (parada: Omit<Parada, "numero">) => {
    const numero = logistica.paradas.length + 1;
    let ubicada = { ...parada, numero };

    if (parada.direccion.trim() && mapRef.current) {
      const geo = await mapRef.current.geocodeAddress(parada.direccion);
      if (geo) {
        ubicada = { ...ubicada, latitud: geo.lat, longitud: geo.lng, direccion: geo.formattedAddress };
        mapRef.current.panTo({ lat: geo.lat, lng: geo.lng });
      }
    }

    onChange({ ...logistica, paradas: [...logistica.paradas, ubicada] });
    setSubTab("paradas");

    // Si no se pudo geocodificar, activar modo colocación para ubicarla con click
    if (ubicada.latitud === 0 && ubicada.longitud === 0) {
      setPlacingParada(numero);
      notify.info("Ubica la parada haciendo click en el mapa.");
    } else {
      notify.success("Parada agregada y ubicada");
    }
  };

  // Click en el mapa estando en modo colocación
  const handleMapClick = async (position: LatLng) => {
    if (placingParada === null) return;
    let direccion = "";
    if (mapRef.current) {
      direccion = (await mapRef.current.reverseGeocode(position.lat, position.lng)) ?? "";
    }
    updateParada(placingParada, {
      latitud: position.lat,
      longitud: position.lng,
      ...(direccion ? { direccion } : {}),
    });
    setPlacingParada(null);
    notify.success("Parada ubicada");
  };

  // Arrastrar el marcador de una parada ya ubicada
  const handleParadaMoved = async (numero: number, position: LatLng) => {
    let direccion: string | undefined;
    if (mapRef.current) {
      direccion = (await mapRef.current.reverseGeocode(position.lat, position.lng)) ?? undefined;
    }
    updateParada(numero, {
      latitud: position.lat,
      longitud: position.lng,
      ...(direccion ? { direccion } : {}),
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(360px,460px)_minmax(0,1fr)] xl:gap-8">
      <section>
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".kml"
            onChange={handleKmlSelected}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded border border-cyan-300 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-100"
          >
            <Upload className="h-4 w-4" />
            Subir KML
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
          <SubTabButton active={subTab === "datos"}   onClick={() => setSubTab("datos")}>
            1. Datos generales
          </SubTabButton>
          <SubTabButton active={subTab === "paradas"} onClick={() => setSubTab("paradas")}>
            2. Puntos de abordaje
          </SubTabButton>
          <SubTabButton active={subTab === "nueva"}   onClick={() => setSubTab("nueva")}>
            3. Nuevo punto
          </SubTabButton>
        </div>

        {subTab === "datos" && (
          <div className="space-y-5">
            <Field label="Dirección de inicio">
              <input
                value={logistica.direccion_inicio}
                onChange={(e) => onChange({ ...logistica, direccion_inicio: e.target.value })}
                className={inputClass}
                placeholder="Dirección donde inicia la ruta"
              />
            </Field>
            <Field label="Dirección de fin">
              <input
                value={logistica.direccion_fin}
                onChange={(e) => onChange({ ...logistica, direccion_fin: e.target.value })}
                className={inputClass}
                placeholder="Dirección donde termina la ruta"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Fecha inicio">
                <input
                  type="date"
                  value={logistica.fecha_inicio ?? ""}
                  onChange={(e) => onChange({ ...logistica, fecha_inicio: e.target.value || null })}
                  className={inputClass}
                />
              </Field>
              <Field label="Tiempo (min)">
                <input
                  type="number"
                  min={0}
                  value={logistica.tiempo_recorrido_min ?? ""}
                  onChange={(e) =>
                    onChange({ ...logistica, tiempo_recorrido_min: e.target.value ? Number(e.target.value) : null })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Kilómetros">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={logistica.kilometros ?? ""}
                  onChange={(e) =>
                    onChange({ ...logistica, kilometros: e.target.value ? Number(e.target.value) : null })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        )}

        {subTab === "paradas" && (
          <div>
            {logistica.paradas.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                No hay paradas. Sube un KML o agrégalas desde la pestaña "Nuevo punto".
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Radio</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {logistica.paradas.map((parada) => {
                      const sinUbicar = parada.latitud === 0 && parada.longitud === 0;
                      return (
                        <tr key={parada.numero} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-500">{parada.numero}</td>
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-700">{parada.nombre}</p>
                            {parada.direccion && (
                              <p className="text-xs text-slate-400">{parada.direccion}</p>
                            )}
                            {sinUbicar && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPlacingParada(parada.numero);
                                  notify.info("Haz click en el mapa para ubicar esta parada.");
                                }}
                                className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700"
                              >
                                <Crosshair className="h-3 w-3" />
                                Sin ubicar — colocar en el mapa
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                value={parada.radio}
                                onChange={(e) =>
                                  updateParada(parada.numero, { radio: Number(e.target.value) })
                                }
                                className="w-16 rounded border border-slate-200 px-2 py-1 text-xs"
                              />
                              <span className="text-xs text-slate-400">m</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => removeParada(parada.numero)}
                              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              aria-label={`Eliminar parada ${parada.numero}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {subTab === "nueva" && <NewParadaForm onAdd={handleAddParada} />}
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4">
        <RouteTraceMap
          ref={mapRef}
          path={logistica.path}
          paradas={logistica.paradas}
          traceColor={logistica.trace_color ?? "#2563eb"}
          placingMode={placingParada !== null}
          onMapClick={handleMapClick}
          onParadaMoved={handleParadaMoved}
        />
      </section>
    </div>
  );
};

const SubTabButton = ({
  active, onClick, children,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
      active
        ? "border border-b-white border-slate-200 bg-white text-cyan-700"
        : "text-slate-500 hover:text-slate-700"
    }`}
  >
    {children}
  </button>
);

interface NewParadaFormProps {
  onAdd: (parada: Omit<Parada, "numero">) => void;
}

const NewParadaForm = ({ onAdd }: NewParadaFormProps) => {
  const [nombre, setNombre]       = useState("");
  const [direccion, setDireccion] = useState("");
  const [tipoGeo, setTipoGeo]     = useState<Parada["tipo_geocerca"]>("circular");
  const [radio, setRadio]         = useState(50);

  const handleAdd = () => {
    if (!nombre.trim()) {
      notify.error("La parada necesita un nombre");
      return;
    }
    onAdd({
      id:            `manual-${Date.now()}`,
      nombre:        nombre.trim(),
      direccion:     direccion.trim(),
      latitud:       0,
      longitud:      0,
      tipo_geocerca: tipoGeo,
      radio,
    });
    setNombre("");
    setDireccion("");
    setRadio(50);
  };

  return (
    <div className="space-y-5">
      <Field label="Nombre *">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={inputClass}
          placeholder="Nombre del punto de abordaje"
        />
      </Field>

      <Field label="Dirección">
        <input
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          className={inputClass}
          placeholder="Escribe la dirección para ubicarla automáticamente"
        />
        <p className="mt-1 text-xs text-slate-400">
          Si dejas la dirección vacía, podrás ubicar la parada haciendo click en el mapa.
        </p>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tipo de geocerca">
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {(["circular", "poligonal", "rectangular"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipoGeo(t)}
                className="flex items-center gap-2 text-sm text-slate-700"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                    tipoGeo === t ? "border-cyan-500" : "border-slate-300"
                  }`}
                >
                  {tipoGeo === t && <span className="h-2 w-2 rounded-full bg-cyan-500" />}
                </span>
                <span className="capitalize">{t}</span>
              </button>
            ))}
          </div>
        </Field>

        {tipoGeo === "circular" && (
          <Field label="Radio en metros">
            <input
              type="number"
              min={1}
              value={radio}
              onChange={(e) => setRadio(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        )}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-2 rounded bg-cyan-500 px-5 py-2 font-medium text-white hover:bg-cyan-600"
      >
        <MapPin className="h-4 w-4" />
        Agregar parada
      </button>
    </div>
  );
};