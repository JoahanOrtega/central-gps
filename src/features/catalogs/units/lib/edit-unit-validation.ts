// ─────────────────────────────────────────────────────────────────────────────
// Validación client-side del form de edición
// ─────────────────────────────────────────────────────────────────────────────
//
// Espejo del UpdateUnitSchema de Marshmallow. Duplicar reglas entre
// frontend y backend no es ideal (violación DRY), pero es un trade-off
// consciente: la validación inline mejora la UX (feedback inmediato sin
// roundtrip al servidor) y el backend sigue siendo la verdad absoluta
// porque tampoco puede confiar en el cliente.
//
// Reglas que reproducimos:
//   - IMEI: 10 dígitos numéricos
//   - odometro_inicial >= 0
//   - capacidad_tanque >= 0
//   - rendimiento_establecido >= 0
//   - fecha_instalacion: no futura
//   - vigencia_*: no en pasado lejano (nuevo — solo cliente, ayuda a
//     detectar typos tipo 1924 en vez de 2024)
//   - numero y marca: requeridos + longitud
//
// Los campos NO validados aquí se validan solo en backend (menos crítico
// para feedback en vivo).

import type { UpdateUnitPayload } from "../types/unit-edit.types";

// Mapa de errores: { campo: "mensaje" }. El componente lo lee y pasa
// el error correspondiente a cada input (error prop).
export type FieldErrors = Partial<Record<keyof UpdateUnitPayload, string>>;

// ── Validadores individuales ────────────────────────────────────────────────
// Cada uno retorna el mensaje de error o null si pasa. Separados para
// poder combinarlos y para testearlos aisladamente.

const validateNumero = (value: string | undefined): string | null => {
    if (!value || value.trim() === "") return "El número es obligatorio";
    if (value.length > 20) return "Máximo 20 caracteres";
    return null;
};

const validateMarca = (value: string | undefined): string | null => {
    if (!value || value.trim() === "") return "La marca es obligatoria";
    if (value.length > 50) return "Máximo 50 caracteres";
    return null;
};

const validateTipo = (value: number | undefined): string | null => {
    if (value === undefined || value === null) return "Selecciona un tipo";
    if (![1, 2, 3, 4, 5, 6, 7].includes(value)) return "Tipo inválido";
    return null;
};

const validateOdometro = (value: number | null | undefined): string | null => {
    if (value === null || value === undefined) return null; // opcional
    if (value < 0) return "El odómetro no puede ser negativo";
    return null;
};

const validateCapacidad = (value: number | null | undefined): string | null => {
    if (value === null || value === undefined) return null;
    if (value < 0) return "No puede ser negativo";
    return null;
};

const validateRendimiento = (value: number | null | undefined): string | null => {
    if (value === null || value === undefined) return null;
    if (value < 0) return "No puede ser negativo";
    return null;
};

// IMEI: espejo exacto del backend. 10 dígitos numéricos.
const validateImei = (value: string | undefined): string | null => {
    if (value === undefined) return null; // opcional en PATCH
    if (value === "") return "El IMEI es obligatorio";
    if (!/^\d{10}$/.test(value)) {
        return "Debe tener exactamente 10 dígitos numéricos";
    }
    return null;
};

const validateChip = (value: string | undefined): string | null => {
    if (value === undefined) return null;
    if (value === "") return "El chip es obligatorio";
    if (value.length > 20) return "Máximo 20 caracteres";
    return null;
};

// Fecha de instalación: no futura (mismo que backend).
const validateFechaInstalacion = (value: string | undefined): string | null => {
    if (!value) return null;
    const today = new Date().toISOString().slice(0, 10);
    if (value > today) return "La fecha no puede ser futura";
    return null;
};

// Año: si viene, 4 caracteres numéricos razonables.
// No obligatorio, no crítico — solo detección de typos obvios.
const validateAnio = (value: string | null | undefined): string | null => {
    if (!value) return null;
    if (!/^\d{4}$/.test(value)) return "Debe tener 4 dígitos";
    const numero = Number(value);
    // Rango razonable: 1950 hasta el año actual + 1 (modelos del próximo año)
    const currentYear = new Date().getFullYear();
    if (numero < 1950 || numero > currentYear + 1) {
        return `Entre 1950 y ${currentYear + 1}`;
    }
    return null;
};

// Matrícula: longitud máxima del backend.
const validateMatricula = (
    value: string | null | undefined,
): string | null => {
    if (!value) return null;
    if (value.length > 20) return "Máximo 20 caracteres";
    return null;
};

// Modelo: longitud máxima.
const validateModelo = (value: string | null | undefined): string | null => {
    if (!value) return null;
    if (value.length > 50) return "Máximo 50 caracteres";
    return null;
};

// ── Validador general ───────────────────────────────────────────────────────
// Recibe el form completo y retorna el mapa de errores. Si está vacío,
// el form es válido.
//
// Uso en el modal:
//   const errors = validateUnitForm(form);
//   if (Object.keys(errors).length > 0) return; // no guardar
export const validateUnitForm = (
    form: UpdateUnitPayload,
): FieldErrors => {
    const errors: FieldErrors = {};

    // Identidad
    const numero = validateNumero(form.numero);
    if (numero) errors.numero = numero;

    const marca = validateMarca(form.marca);
    if (marca) errors.marca = marca;

    const modelo = validateModelo(form.modelo);
    if (modelo) errors.modelo = modelo;

    const anio = validateAnio(form.anio);
    if (anio) errors.anio = anio;

    const matricula = validateMatricula(form.matricula);
    if (matricula) errors.matricula = matricula;

    const tipo = validateTipo(form.tipo);
    if (tipo) errors.tipo = tipo;

    const odometro = validateOdometro(form.odometro_inicial);
    if (odometro) errors.odometro_inicial = odometro;

    // Combustible
    const capacidad = validateCapacidad(form.capacidad_tanque);
    if (capacidad) errors.capacidad_tanque = capacidad;

    const rendimiento = validateRendimiento(form.rendimiento_establecido);
    if (rendimiento) errors.rendimiento_establecido = rendimiento;

    // Equipo instalado (solo si los campos vinieron — son opcionales para
    // admin_empresa, el backend ya los filtra por rol).
    if ("imei" in form) {
        const imei = validateImei(form.imei);
        if (imei) errors.imei = imei;

        const chip = validateChip(form.chip);
        if (chip) errors.chip = chip;

        const fechaInst = validateFechaInstalacion(form.fecha_instalacion);
        if (fechaInst) errors.fecha_instalacion = fechaInst;
    }

    return errors;
};

// Helper para saber si hay errores sin escribir Object.keys en cada lado.
export const hasErrors = (errors: FieldErrors): boolean =>
    Object.keys(errors).length > 0;