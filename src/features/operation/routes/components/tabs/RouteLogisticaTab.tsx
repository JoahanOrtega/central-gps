import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, MapPin, Trash2, Crosshair, MapPinned, Flag, CircleDot, Route, Loader2, Pencil, Check, Ban, Undo2 } from "lucide-react";
import type { Logistica, Parada, LatLng } from "../../types/route.types";
import { parseKmlRoute } from "../../lib/kml"
import { distanciaTrazoKm } from "../../lib/trace-distance";
import { notify } from "@/stores/notificationStore";
import { Field, inputClass } from "@/components/shared/form-helpers";
import { RouteTraceMap, type RouteTraceMapHandle } from "../RouteTraceMap";
import { PoiSelectorModal } from "../PoiSelectorModal";
import { PoiAddressInput } from "../PoiAddressInput";

interface RouteLogisticaTabProps {
  logistica: Logistica;
  onChange: (logistica: Logistica) => void;
}

type SubTab = "datos" | "paradas" | "nueva";

export const RouteLogisticaTab = ({ logistica, onChange }: RouteLogisticaTabProps) => {
  const [subTab, setSubTab] = useState<SubTab>("datos");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<RouteTraceMapHandle | null>(null);

  // Parada pendiente de ubicar con click en el mapa (modo colocación)
  const [placingParada, setPlacingParada] = useState<number | null>(null);
  // Modal selector de POIs — guarda PARA QUÉ campo se abrió:
  // "inicio"/"fin" = parada fija | "nueva" = parada intermedia
  const [poiSelectorTarget, setPoiSelectorTarget] =
    useState<"inicio" | "fin" | "nueva" | null>(null);
  // Generación de trazo: estado de carga para feedback en la UI
  const [generando, setGenerando] = useState(false);
  // Parada que se está editando (por número); null = no se edita ninguna
  const [editandoParada, setEditandoParada] = useState<number | null>(null);

  // Historial de cambios para deshacer (Ctrl+Z). Guardamos snapshots de la logística
  const historialRef = useRef<Logistica[]>([]);
  const [puedeDeshacer, setPuedeDeshacer] = useState(false);

  const guardarSnapshot = () => {
    historialRef.current.push(structuredClone(logistica));
    // Tope acotado: 20 pasos cubren cualquier sesión real de edición sin
    // acumular memoria sin límite.
    if (historialRef.current.length > 20) historialRef.current.shift();
    setPuedeDeshacer(true);
  };

  const handleDeshacer = () => {
    const anterior = historialRef.current.pop();
    if (!anterior) return;
    onChange(anterior);
    setPuedeDeshacer(historialRef.current.length > 0);
  };

  // Detectar Ctrl+Z / Cmd+Z para deshacer cambios. No interferir con inputs.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const enCampo = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (enCampo) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleDeshacer();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Distancia real del trazo, recalculada solo cuando el path cambia.
  const kmTrazo = useMemo(() => distanciaTrazoKm(logistica.path), [logistica.path]);
  const paradasUbicadas = logistica.paradas.filter((p) => p.latitud !== 0 && p.longitud !== 0).length;

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

      // Marcamos la primera parada como Inicio y la última como Fin,
      // igual que cuando se definen manualmente. Las de en medio quedan
      // como intermedias.
      const total = result.waypoints.length;
      const paradas: Parada[] = result.waypoints.map((p, i) => {
        const esInicio = i === 0;
        const esFin = i === total - 1 && total > 1;
        return {
          ...p,
          numero: i + 1,
          nombre: esInicio ? "Inicio de ruta" : esFin ? "Fin de ruta" : p.nombre,
          esFija: esInicio ? "inicio" : esFin ? "fin" : undefined,
          radio: esInicio || esFin ? 200 : p.radio,
        };
      });

      // Si el KML no trae dirección, intentamos geocodificar la primera y última parada
      const inicioWp = result.waypoints[0];
      const finWp = total > 1 ? result.waypoints[total - 1] : undefined;

      let direccionInicio = inicioWp?.direccion ?? "";
      let direccionFin = finWp?.direccion ?? "";

      if (mapRef.current) {
        if (!direccionInicio && inicioWp) {
          direccionInicio =
            (await mapRef.current.reverseGeocode(inicioWp.latitud, inicioWp.longitud)) ?? "";
        }
        if (!direccionFin && finWp) {
          direccionFin =
            (await mapRef.current.reverseGeocode(finWp.latitud, finWp.longitud)) ?? "";
        }
      }

      // Si hay paradas de inicio/fin, las marcamos como fijas y actualizamos la dirección de la logística
      const paradasSincronizadas = paradas.map((p) => {
        if (p.esFija === "inicio" && direccionInicio) return { ...p, direccion: direccionInicio };
        if (p.esFija === "fin" && direccionFin) return { ...p, direccion: direccionFin };
        return p;
      });

      guardarSnapshot();
      onChange({
        ...logistica,
        path: result.trace,
        paradas: paradasSincronizadas,
        direccion_inicio: direccionInicio || logistica.direccion_inicio,
        direccion_fin: direccionFin || logistica.direccion_fin,
      });
      notify.success(
        `KML importado: ${result.trace.length} puntos de trazo y ${total} paradas (inicio y fin marcados).`,
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
    guardarSnapshot();
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
    guardarSnapshot();
    onChange({ ...logistica, paradas: filtered });
    if (placingParada === numero) setPlacingParada(null);
  };

  // Reordena las paradas para que la de inicio quede primera, la de fin última y las intermedias en medio.
  const reordenarParadas = (paradas: Parada[]): Parada[] => {
    const inicio = paradas.find((p) => p.esFija === "inicio");
    const fin = paradas.find((p) => p.esFija === "fin");
    const intermedias = paradas.filter((p) => !p.esFija);
    const ordenadas = [
      ...(inicio ? [inicio] : []),
      ...intermedias,
      ...(fin ? [fin] : []),
    ];
    return ordenadas.map((p, i) => ({ ...p, numero: i + 1 }));
  };

  // Crea o reemplaza la parada fija de inicio/fin a partir de unos datos.
  // Une el cambio de dirección y el de paradas en un solo onChange.
  const setParadaFija = (
    rol: "inicio" | "fin",
    datos: { nombre: string; direccion: string; latitud: number; longitud: number; id_poi?: number | null },
  ) => {
    const otras = logistica.paradas.filter((p) => p.esFija !== rol);
    const fija: Parada = {
      id: `fija-${rol}`,
      numero: 0, // se recalcula en reordenarParadas
      nombre: rol === "inicio" ? "Inicio de ruta" : "Fin de ruta",
      direccion: datos.direccion,
      latitud: datos.latitud,
      longitud: datos.longitud,
      tipo_geocerca: "circular",
      radio: 200, // las paradas de inicio/fin usan radio amplio
      esFija: rol,
      id_poi: datos.id_poi ?? null,
    };
    guardarSnapshot();
    onChange({
      ...logistica,
      [rol === "inicio" ? "direccion_inicio" : "direccion_fin"]: datos.direccion,
      paradas: reordenarParadas([...otras, fija]),
    });
  };

  // Geocodifica una dirección libre y la fija como inicio/fin
  const resolverDireccionFija = async (rol: "inicio" | "fin", direccion: string) => {
    if (!mapRef.current) return;
    const geo = await mapRef.current.geocodeAddress(direccion);
    if (!geo) {
      notify.error("No se pudo ubicar esa dirección. Intenta ser más específico.");
      return;
    }
    setParadaFija(rol, {
      nombre: rol === "inicio" ? "Inicio de ruta" : "Fin de ruta",
      direccion: geo.formattedAddress,
      latitud: geo.lat,
      longitud: geo.lng,
    });
    mapRef.current.panTo({ lat: geo.lat, lng: geo.lng });
  };

  // Agregar una parada intermedia (desde "Nuevo punto" o el selector)
  const handleAddParada = async (parada: Omit<Parada, "numero">) => {
    let ubicada = { ...parada, numero: 0 };

    // Si ya viene con coordenadas (ej: desde un POI), no geocodificar
    const yaUbicada = parada.latitud !== 0 && parada.longitud !== 0;

    if (!yaUbicada && parada.direccion.trim() && mapRef.current) {
      const geo = await mapRef.current.geocodeAddress(parada.direccion);
      if (geo) {
        ubicada = { ...ubicada, latitud: geo.lat, longitud: geo.lng, direccion: geo.formattedAddress };
      }
    }

    // Insertar respetando el orden (queda entre inicio y fin)
    const nuevas = reordenarParadas([...logistica.paradas, ubicada]);
    guardarSnapshot();
    onChange({ ...logistica, paradas: nuevas });
    setSubTab("paradas");

    if (ubicada.latitud !== 0 && ubicada.longitud !== 0) {
      mapRef.current?.panTo({ lat: ubicada.latitud, lng: ubicada.longitud });
      notify.success("Parada agregada y ubicada");
    } else {
      // numero real tras reordenar
      const insertada = nuevas.find((p) => p.id === ubicada.id);
      if (insertada) setPlacingParada(insertada.numero);
      notify.info("Ubica la parada haciendo click en el mapa.");
    }
  };

  // El selector de POIs devuelve una parada; según para qué se abrió,
  // la usamos como inicio, fin o parada intermedia.
  const handlePoiSelected = (parada: Omit<Parada, "numero">) => {
    if (poiSelectorTarget === "inicio" || poiSelectorTarget === "fin") {
      setParadaFija(poiSelectorTarget, {
        nombre: parada.nombre,
        direccion: parada.direccion,
        latitud: parada.latitud,
        longitud: parada.longitud,
        id_poi: parada.id_poi,
      });
      setSubTab("paradas");
    } else {
      handleAddParada(parada);
    }
    setPoiSelectorTarget(null);
  };

  // Guardar los cambios de la parada en edición
  const handleSaveParada = async (patch: Partial<Parada>) => {
    if (editandoParada === null) return;

    // Si cambió la dirección y no hay coordenadas nuevas, geocodificar
    let finalPatch = { ...patch };
    if (patch.direccion && patch.latitud === undefined && mapRef.current) {
      const geo = await mapRef.current.geocodeAddress(patch.direccion);
      if (geo) {
        finalPatch = { ...finalPatch, latitud: geo.lat, longitud: geo.lng, direccion: geo.formattedAddress };
      }
    }

    updateParada(editandoParada, finalPatch);
    setEditandoParada(null);

    // Si la parada quedó ubicada, centrar el mapa en ella
    const lat = finalPatch.latitud;
    const lng = finalPatch.longitud;
    if (lat && lng) mapRef.current?.panTo({ lat, lng });
    notify.success("Parada actualizada");
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

  // El usuario editó los vértices de una geocerca poligonal en el mapa
  const handleParadaPolygonChanged = (numero: number, vertices: LatLng[]) => {
    updateParada(numero, { poligono: vertices });
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

  // Genera el trazo de la ruta conectando las paradas ubicadas por carretera.
  const handleGenerateTrace = async () => {
    const ubicadas = logistica.paradas.filter(
      (p) => p.latitud !== 0 && p.longitud !== 0,
    );
    if (ubicadas.length < 2) {
      notify.error("Necesitas al menos 2 paradas ubicadas para generar el trazo.");
      return;
    }
    if (!mapRef.current) return;

    setGenerando(true);
    try {
      const stops = ubicadas.map((p) => ({ lat: p.latitud, lng: p.longitud }));
      const result = await mapRef.current.generateTrace(stops);

      if (!result || result.path.length === 0) {
        notify.error(
          "No se pudo generar el trazo por carretera. Verifica que las paradas tengan ubicación válida.",
        );
        return;
      }

      // Actualizamos el trazo y autocompletamos los kilómetros
      guardarSnapshot();
      onChange({
        ...logistica,
        path: result.path,
        kilometros: Number(result.distanceKm.toFixed(2)),
      });
      notify.success(`Trazo generado: ${result.distanceKm.toFixed(2)} km siguiendo calles`);
    } catch {
      notify.error("Ocurrió un error al generar el trazo.");
    } finally {
      setGenerando(false);
    }
  };

  const totalParadas = logistica.paradas.length;

  // El rol de una parada viene de su flag esFija (no de su posición)
  const getRolParada = (parada: Parada): "inicio" | "fin" | "intermedia" =>
    parada.esFija ?? "intermedia";

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(360px,460px)_minmax(0,1fr)] xl:gap-8">
      <section>
        {/* Barra de acciones */}
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
          <SubTabButton active={subTab === "datos"} onClick={() => setSubTab("datos")}>
            1. Datos generales
          </SubTabButton>
          <SubTabButton active={subTab === "paradas"} onClick={() => setSubTab("paradas")}>
            2. Puntos de abordaje
          </SubTabButton>
          <SubTabButton active={subTab === "nueva"} onClick={() => setSubTab("nueva")}>
            3. Nuevo punto
          </SubTabButton>
        </div>

        {/* Barra de estado del trazo */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span>
              <span className="font-medium text-slate-800">
                {logistica.path.length > 0 ? `${kmTrazo.toFixed(1)} km` : "Sin trazo"}
              </span>
              {logistica.path.length > 0 && ` · ${logistica.path.length} puntos`}
            </span>
            <span>
              <span className="font-medium text-slate-800">{paradasUbicadas}</span>
              {` de ${logistica.paradas.length} paradas ubicadas`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleDeshacer}
            disabled={!puedeDeshacer}
            title="Deshacer última acción (Ctrl+Z)"
            className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Deshacer
          </button>
        </div>

        {subTab === "datos" && (
          <div className="space-y-5">
            <Field label="Dirección de inicio *">
              <PoiAddressInput
                value={logistica.direccion_inicio}
                onChange={(address) => onChange({ ...logistica, direccion_inicio: address })}
                onBrowsePois={() => setPoiSelectorTarget("inicio")}
                onResolveText={(address) => resolverDireccionFija("inicio", address)}
                onPoiSelect={(poi) =>
                  setParadaFija("inicio", {
                    nombre: poi.nombre,
                    direccion: poi.direccion ?? poi.nombre,
                    latitud: poi.lat ?? 0,
                    longitud: poi.lng ?? 0,
                    id_poi: poi.id_poi,
                  })
                }
                placeholder="Busca un POI o escribe la dirección de inicio"
              />
            </Field>
            <Field label="Dirección de fin *">
              <PoiAddressInput
                value={logistica.direccion_fin}
                onChange={(address) => onChange({ ...logistica, direccion_fin: address })}
                onBrowsePois={() => setPoiSelectorTarget("fin")}
                onResolveText={(address) => resolverDireccionFija("fin", address)}
                onPoiSelect={(poi) =>
                  setParadaFija("fin", {
                    nombre: poi.nombre,
                    direccion: poi.direccion ?? poi.nombre,
                    latitud: poi.lat ?? 0,
                    longitud: poi.lng ?? 0,
                    id_poi: poi.id_poi,
                  })
                }
                placeholder="Busca un POI o escribe la dirección de fin"
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

        {subTab === "paradas" && editandoParada !== null && (
          <ParadaEditor
            parada={logistica.paradas.find((p) => p.numero === editandoParada)!}
            onSave={handleSaveParada}
            onCancel={() => setEditandoParada(null)}
          />
        )}

        {subTab === "paradas" && editandoParada === null && (
          <div className="space-y-4">
            {/* Panel para generar el trazo de la ruta */}
            <TraceGeneratorPanel
              paradasUbicadas={logistica.paradas.filter((p) => p.latitud !== 0 && p.longitud !== 0).length}
              tieneTrazo={logistica.path.length > 0}
              generando={generando}
              onGenerate={handleGenerateTrace}
            />

            {totalParadas === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                No hay paradas. Sube un KML, selecciónalas desde POIs o agrégalas en "Nuevo punto".
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
                      const rol = getRolParada(parada);

                      return (
                        <tr key={parada.numero} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-500">{parada.numero}</td>
                          <td className="px-3 py-2">
                            {/* Badge de inicio / fin */}
                            {rol === "inicio" && (
                              <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                <CircleDot className="h-3 w-3" /> Inicio de ruta
                              </span>
                            )}
                            {rol === "fin" && (
                              <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                                <Flag className="h-3 w-3" /> Fin de ruta
                              </span>
                            )}
                            <p className="font-medium text-slate-700">{parada.nombre}</p>
                            {parada.direccion && (
                              <p className="text-xs text-slate-400">{parada.direccion}</p>
                            )}
                            {parada.id_poi && (
                              <p className="text-[11px] text-cyan-600">Desde POI</p>
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
                            <div className="flex items-center gap-1">
                              {/* Editar (disponible para todas, incluidas inicio/fin) */}
                              <button
                                type="button"
                                onClick={() => setEditandoParada(parada.numero)}
                                className="rounded p-1.5 text-slate-400 hover:bg-cyan-50 hover:text-cyan-600"
                                aria-label={`Editar parada ${parada.numero}`}
                                title="Editar parada"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              {/* Inicio y fin no se pueden eliminar */}
                              {rol === "intermedia" ? (
                                <button
                                  type="button"
                                  onClick={() => removeParada(parada.numero)}
                                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                  aria-label={`Eliminar parada ${parada.numero}`}
                                  title="Eliminar parada"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : (
                                <span className="px-1 text-[11px] text-slate-300" title="Las paradas de inicio y fin no se pueden eliminar">
                                  fija
                                </span>
                              )}
                            </div>
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

        {subTab === "nueva" && (
          <NewParadaForm
            onAdd={handleAddParada}
            onOpenPoiSelector={() => setPoiSelectorTarget("nueva")}
          />
        )}
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
          onParadaPolygonChanged={handleParadaPolygonChanged}
        />
      </section>

      {/* Modal selector de POIs (compartido por inicio, fin y nueva parada) */}
      <PoiSelectorModal
        open={poiSelectorTarget !== null}
        onClose={() => setPoiSelectorTarget(null)}
        onSelect={handlePoiSelected}
      />
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
    className={`rounded-t-lg px-3 py-2 text-sm font-medium ${active
      ? "border border-b-white border-slate-200 bg-white text-cyan-700"
      : "text-slate-500 hover:text-slate-700"
      }`}
  >
    {children}
  </button>
);

// ── Panel para generar el trazo de la ruta ───────────────────────────────────
// UX: cambia su contenido según el estado para guiar al usuario.
//   - Pocas paradas → mensaje de ayuda (deshabilitado)
//   - Listo para generar → llamada a la acción con dos modos
//   - Trazo ya generado → confirmación + opción de regenerar
interface TraceGeneratorPanelProps {
  paradasUbicadas: number;
  tieneTrazo: boolean;
  generando: boolean;
  onGenerate: () => void;
}

const TraceGeneratorPanel = ({
  paradasUbicadas, tieneTrazo, generando, onGenerate,
}: TraceGeneratorPanelProps) => {
  const listo = paradasUbicadas >= 2;

  // Estado: aún no hay suficientes paradas
  if (!listo) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        <Route className="h-5 w-5 shrink-0 text-slate-400" />
        <p>
          Agrega al menos <span className="font-medium text-slate-600">2 paradas ubicadas</span> para
          generar el trazo de la ruta automáticamente.
        </p>
      </div>
    );
  }

  // Estado: generando (spinner)
  if (generando) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
        <p>Generando el trazo de la ruta, un momento...</p>
      </div>
    );
  }

  // Estado: listo para generar (o regenerar si ya hay trazo)
  return (
    <div className="rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white px-4 py-3.5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
          <Route className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-700">
            {tieneTrazo ? "Regenerar trazo" : "Generar trazo de la ruta"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {tieneTrazo
              ? `Trazo existente. Vuelve a generarlo si modificaste las paradas.`
              : `Conecta las ${paradasUbicadas} paradas ubicadas siguiendo las calles reales.`}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onGenerate}
              className="flex items-center gap-2 rounded-lg bg-cyan-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-cyan-600"
            >
              <Route className="h-4 w-4" />
              Generar trazo
            </button>

          </div>


        </div>
      </div>
    </div>
  );
};

interface NewParadaFormProps {
  onAdd: (parada: Omit<Parada, "numero">) => void;
  onOpenPoiSelector: () => void;
}

const NewParadaForm = ({ onAdd, onOpenPoiSelector }: NewParadaFormProps) => {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [tipoGeo, setTipoGeo] = useState<Parada["tipo_geocerca"]>("circular");
  const [radio, setRadio] = useState(50);

  const handleAdd = () => {
    if (!nombre.trim()) {
      notify.error("La parada necesita un nombre");
      return;
    }
    onAdd({
      id: `manual-${Date.now()}`,
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      latitud: 0,
      longitud: 0,
      tipo_geocerca: tipoGeo,
      radio,
      id_poi: null,
    });
    setNombre("");
    setDireccion("");
    setRadio(50);
  };

  return (
    <div className="space-y-5">
      {/* Acceso directo al selector de POIs */}
      <button
        type="button"
        onClick={onOpenPoiSelector}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-cyan-300 bg-cyan-50/50 px-4 py-3 text-sm font-medium text-cyan-700 hover:bg-cyan-50"
      >
        <MapPinned className="h-4 w-4" />
        Seleccionar desde un POI existente
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-2 text-xs text-slate-400">o captura una nueva</span>
        </div>
      </div>

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
                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${tipoGeo === t ? "border-cyan-500" : "border-slate-300"
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

// ── Editor de una parada individual ──────────────────────────────────────────
// Permite cambiar nombre, dirección, tipo de geocerca y radio. La edición de
// inicio/fin también pasa por aquí (conservan su rol). El dibujo de polígonos
// en el mapa llegará en la Entrega 3; por ahora se conserva el polígono que
// la parada ya tenga (ej: importado de un POI).
interface ParadaEditorProps {
  parada: Parada;
  onSave: (patch: Partial<Parada>) => void;
  onCancel: () => void;
}

const ParadaEditor = ({ parada, onSave, onCancel }: ParadaEditorProps) => {
  const [nombre, setNombre] = useState(parada.nombre);
  const [direccion, setDireccion] = useState(parada.direccion);
  const [tipoGeo, setTipoGeo] = useState<Parada["tipo_geocerca"]>(parada.tipo_geocerca);
  const [radio, setRadio] = useState(parada.radio);
  // Coordenadas nuevas si el usuario elige un POI (si no, el padre geocodifica)
  const [nuevasCoords, setNuevasCoords] = useState<{ lat: number; lng: number } | null>(null);

  const esFija = parada.esFija !== undefined;
  const vertices = parada.poligono?.length ?? 0;

  const handleGuardar = () => {
    if (!nombre.trim()) {
      notify.error("La parada necesita un nombre");
      return;
    }
    onSave({
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      tipo_geocerca: tipoGeo,
      radio,
      // Solo mandamos coords si vienen de un POI; si no, el padre geocodifica
      ...(nuevasCoords ? { latitud: nuevasCoords.lat, longitud: nuevasCoords.lng } : {}),
    });
  };

  return (
    <div className="space-y-5 rounded-xl border border-cyan-200 bg-cyan-50/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-700">
            {parada.numero}
          </span>
          <h3 className="text-sm font-semibold text-slate-700">
            Editando {esFija ? (parada.esFija === "inicio" ? "Inicio de ruta" : "Fin de ruta") : "parada"}
          </h3>
        </div>
        {esFija && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${parada.esFija === "inicio" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}>
            {parada.esFija === "inicio" ? "Inicio" : "Fin"}
          </span>
        )}
      </div>

      <Field label="Nombre *">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={inputClass}
          placeholder="Nombre de la parada"
        />
      </Field>

      <Field label="Dirección">
        <PoiAddressInput
          value={direccion}
          onChange={(addr) => {
            setDireccion(addr);
            setNuevasCoords(null); // edición manual: el padre geocodificará
          }}
          onPoiSelect={(poi) => {
            setDireccion(poi.direccion ?? poi.nombre);
            if (poi.lat && poi.lng) setNuevasCoords({ lat: poi.lat, lng: poi.lng });
          }}
          placeholder="Busca un POI o escribe la dirección"
        />
      </Field>

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
                className={`flex h-4 w-4 items-center justify-center rounded-full border ${tipoGeo === t ? "border-cyan-500" : "border-slate-300"
                  }`}
              >
                {tipoGeo === t && <span className="h-2 w-2 rounded-full bg-cyan-500" />}
              </span>
              <span className="capitalize">{t}</span>
            </button>
          ))}
        </div>
      </Field>

      {tipoGeo === "circular" ? (
        <Field label="Radio en metros">
          <input
            type="number"
            min={1}
            value={radio}
            onChange={(e) => setRadio(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-500">
          {vertices > 0
            ? `Geocerca ${tipoGeo} con ${vertices} vértices. Puedes ajustar los vértices arrastrándolos directamente en el mapa.`
            : `Geocerca ${tipoGeo} sin vértices definidos. Importa la parada desde un POI poligonal para editar su forma en el mapa.`}
        </div>
      )}

      {/* Botones Descartar / Guardar */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Ban className="h-4 w-4" />
          Descartar
        </button>
        <button
          type="button"
          onClick={handleGuardar}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
        >
          <Check className="h-4 w-4" />
          Guardar cambios
        </button>
      </div>
    </div>
  );
};