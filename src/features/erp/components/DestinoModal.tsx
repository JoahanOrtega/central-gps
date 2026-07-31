import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";

import { destinoService } from "../services/destinoService";
import { getEmpresas } from "../services/erpService";
import type { EmpresaResumen } from "../types/erp.types";
import type { Destino, TipoDestino } from "../types/destino.types";
import { queryKeys } from "@/lib/query-keys";

interface Props {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onSaved: () => void;
    destino?: Destino | null; // null/undefined = alta; con valor = edición
}

// Deja solo dígitos y corta a 10 (número mexicano sin lada).
const normalizar10 = (v: string) => v.replace(/\D/g, "").slice(0, 10);
const esTelefonoValido = (v: string) => v.length === 10;
// El sistema antepone el 52 — el usuario nunca lo escribe.
const conLada = (v: string) => `52${v}`;
const sinLada = (v: string | null) => (v ?? "").replace(/^52/, "");

export function DestinoModal({ open, onOpenChange, onSaved, destino }: Props) {
    const editando = !!destino;

    const [idEmpresa, setIdEmpresa] = useState("");
    const [tipo, setTipo] = useState<TipoDestino>("grupo");
    const [nombre, setNombre] = useState("");
    const [telefono, setTelefono] = useState("");            // persona (10 dígitos)
    const [participanteInput, setParticipanteInput] = useState("");
    const [participantes, setParticipantes] = useState<string[]>([]); // grupo

    // Precargar campos al abrir en modo edición.
    useEffect(() => {
        if (open && destino) {
            setIdEmpresa(String(destino.id_empresa));
            setTipo(destino.tipo);
            setNombre(destino.nombre);
            setTelefono(sinLada(destino.telefono));
            setParticipantes([]);
        }
        if (open && !destino) limpiar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, destino]);

    // Empresas activas — misma queryKey que EmpresasPage: caché compartido.
    const { data: empresas = [], isLoading: cargandoEmpresas } = useQuery<EmpresaResumen[]>({
        queryKey: queryKeys.erp.empresas(),
        queryFn: getEmpresas,
        enabled: open, // solo consulta (si hace falta) cuando el modal está abierto
    });
    const empresasActivas = empresas.filter((e) => e.status === 1);

    const guardar = useMutation({
        mutationFn: () =>
            editando
                ? destinoService.editar(destino!.id_destino_whatsapp, {
                    id_empresa: Number(idEmpresa),
                    nombre: nombre.trim(),
                    telefono: tipo === "persona" ? conLada(telefono) : undefined,
                })
                : destinoService.crear({
                    id_empresa: Number(idEmpresa),
                    tipo,
                    nombre: nombre.trim(),
                    telefono: tipo === "persona" ? conLada(telefono) : undefined,
                    participantes: tipo === "grupo" ? participantes.map(conLada) : undefined,
                }),
        onSuccess: () => {
            limpiar();
            onOpenChange(false);
            onSaved();
        },
    });

    function limpiar() {
        setIdEmpresa("");
        setTipo("grupo");
        setNombre("");
        setTelefono("");
        setParticipanteInput("");
        setParticipantes([]);
    }

    function agregarParticipante() {
        const t = normalizar10(participanteInput);
        if (esTelefonoValido(t) && !participantes.includes(t)) {
            setParticipantes((prev) => [...prev, t]);
            setParticipanteInput("");
        }
    }

    const puedeGuardar =
        idEmpresa !== "" &&
        nombre.trim().length > 0 &&
        (editando
            ? tipo === "grupo" || esTelefonoValido(telefono)
            : tipo === "persona"
                ? esTelefonoValido(telefono)
                : participantes.length > 0);

    if (!open) return null;

    const inputClass =
        "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400";
    const labelClass = "mb-1 block text-sm font-medium text-slate-700";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 className="text-lg font-semibold text-slate-800">
                        {editando ? "Editar destino" : "Nuevo destino"}
                    </h2>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-4 px-5 py-4">
                    {/* Empresa: select de activas */}
                    <div>
                        <label htmlFor="empresa" className={labelClass}>Empresa</label>
                        <select
                            id="empresa"
                            className={inputClass + " bg-white"}
                            value={idEmpresa}
                            onChange={(e) => setIdEmpresa(e.target.value)}
                            disabled={editando}
                        >
                            <option value="" disabled>
                                {cargandoEmpresas ? "Cargando empresas..." : "Selecciona una empresa"}
                            </option>
                            {empresasActivas.map((e) => (
                                <option key={e.id_empresa} value={e.id_empresa}>
                                    {e.empresa}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Tipo — segmented (bloqueado en edición) */}
                    <div>
                        <span className={labelClass}>Tipo de destino</span>
                        <div className="flex gap-2">
                            {(["grupo", "persona"] as TipoDestino[]).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => !editando && setTipo(t)}
                                    disabled={editando}
                                    className={
                                        "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed " +
                                        (tipo === t
                                            ? "border-blue-500 bg-blue-50 text-blue-700"
                                            : "border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50")
                                    }
                                >
                                    {t === "grupo" ? "Grupo" : "Persona"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Nombre */}
                    <div>
                        <label htmlFor="nombre" className={labelClass}>Nombre</label>
                        <input
                            id="nombre"
                            className={inputClass}
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder={tipo === "grupo" ? "Alertas Tadimex" : "Juan Perez"}
                        />
                    </div>

                    {/* Persona: UN teléfono con prefijo +52 fijo */}
                    {tipo === "persona" && (
                        <div>
                            <label htmlFor="telefono" className={labelClass}>Teléfono</label>
                            <div className="flex overflow-hidden rounded-lg border border-slate-200 focus-within:border-slate-400">
                                <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                                    +52
                                </span>
                                <input
                                    id="telefono"
                                    className="w-full px-3 py-2 text-sm text-slate-800 outline-none"
                                    value={telefono}
                                    onChange={(e) => setTelefono(normalizar10(e.target.value))}
                                    placeholder="4491234567"
                                    inputMode="numeric"
                                />
                            </div>
                            {telefono.length > 0 && !esTelefonoValido(telefono) && (
                                <p className="mt-1 text-xs text-red-500">Deben ser 10 dígitos.</p>
                            )}
                        </div>
                    )}

                    {/* Grupo: participantes (chips), cada uno con +52 automático */}
                    {tipo === "grupo" && !editando && (
                        <div>
                            <label htmlFor="participante" className={labelClass}>Participantes del grupo</label>
                            <div className="flex gap-2">
                                <div className="flex flex-1 overflow-hidden rounded-lg border border-slate-200 focus-within:border-slate-400">
                                    <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                                        +52
                                    </span>
                                    <input
                                        id="participante"
                                        className="w-full px-3 py-2 text-sm text-slate-800 outline-none"
                                        value={participanteInput}
                                        onChange={(e) => setParticipanteInput(normalizar10(e.target.value))}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") { e.preventDefault(); agregarParticipante(); }
                                        }}
                                        placeholder="4491234567"
                                        inputMode="numeric"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={agregarParticipante}
                                    disabled={!esTelefonoValido(participanteInput)}
                                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Plus className="h-4 w-4" />
                                    Agregar
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                10 dígitos por número. Enter o Agregar suma cada uno.
                            </p>

                            {participantes.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {participantes.map((t) => (
                                        <span
                                            key={t}
                                            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                                        >
                                            +52 {t}
                                            <button
                                                type="button"
                                                onClick={() => setParticipantes((p) => p.filter((x) => x !== t))}
                                                className="text-slate-400 hover:text-slate-600"
                                                aria-label={`Quitar ${t}`}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <p className="mt-2 text-xs text-slate-500">
                                Se creará el grupo en WhatsApp con estas personas y el número del
                                sistema como administrador. Si alguien tiene restringido que lo
                                agreguen a grupos, recibirá una invitación para unirse.
                            </p>
                        </div>
                    )}

                    {tipo === "grupo" && editando && (
                        <p className="text-xs text-slate-500">
                            Los participantes del grupo se gestionan desde WhatsApp por ahora.
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => guardar.mutate()}
                        disabled={!puedeGuardar || guardar.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {guardar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {editando ? "Guardar cambios" : "Guardar destino"}
                    </button>
                </div>
            </div>
        </div>
    );
}