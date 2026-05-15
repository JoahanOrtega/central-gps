// ─────────────────────────────────────────────────────────────────────────────
// Validación de filtros del lado del cliente.
//
// OBJETIVO: que el frontend rechace combinaciones inválidas ANTES de pegarle
// al backend, en línea con la heurística H5 de Nielsen (prevención de
// errores). El backend sigue siendo la fuente de verdad — este schema es un
// espejo intencional del EventosFiltrosSchema de marshmallow.
//
// REGLA: si el contrato del backend cambia, este archivo cambia. No hay
// otra fuente de verdad en el frontend.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";
import type { TipoEventoGeocerca } from "./eventos.types";

// Tipos de evento válidos — coincide con `validos` del validator Python.
const TIPOS_VALIDOS = [3, 4, 10, 11, 12, 13, 14, 15, 19] as const satisfies readonly TipoEventoGeocerca[];

const RANGO_MAX_DIAS = 90;
const LIMITE_MAX = 200;

// ── ISO 8601 con o sin sufijo 'Z' ────────────────────────────────────────────
// Coincide con lo que envía el frontend (toISOString() siempre termina en 'Z').
// Aceptamos también offsets explícitos como -06:00 por si el usuario navega
// con presets que ya están localizados.
const isoDateTime = z
    .string()
    .refine(
        (v) => !Number.isNaN(new Date(v).getTime()),
        "Fecha inválida — usa el formato ISO 8601",
    );

// ── Schema base ──────────────────────────────────────────────────────────────
// Refleja exactamente lo que acepta GET /eventos. Todos los campos son
// opcionales porque el backend tiene defaults — el cliente sólo valida
// los que se enviarán.
export const eventosFiltrosSchema = z
    .object({
        desde: isoDateTime.optional(),
        hasta: isoDateTime.optional(),
        id_unidad: z
            .number()
            .int("Debe ser un entero")
            .positive("Debe ser positivo")
            .nullable()
            .optional(),
        id_poi: z
            .number()
            .int("Debe ser un entero")
            .positive("Debe ser positivo")
            .nullable()
            .optional(),
        tipos_evento: z
            .array(
                z.union(
                    TIPOS_VALIDOS.map((t) => z.literal(t)) as [
                        z.ZodLiteral<typeof TIPOS_VALIDOS[number]>,
                        ...z.ZodLiteral<typeof TIPOS_VALIDOS[number]>[],
                    ],
                ),
            )
            .optional(),
        pagina: z.number().int().min(1).optional(),
        limite: z.number().int().min(1).max(LIMITE_MAX).optional(),
    })
    .superRefine((data, ctx) => {
        // ── Rango temporal coherente ─────────────────────────────────────────
        if (data.desde && data.hasta) {
            const d = new Date(data.desde);
            const h = new Date(data.hasta);

            if (d > h) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["desde"],
                    message: "La fecha de inicio debe ser anterior o igual a la de fin",
                });
                return;
            }

            const diffDias = (h.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDias > RANGO_MAX_DIAS) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["desde"],
                    message: `El rango máximo es de ${RANGO_MAX_DIAS} días — selecciona un período más corto`,
                });
            }
        }
    });

export type EventosFiltrosValidos = z.infer<typeof eventosFiltrosSchema>;

// ── Resultado tipado para consumidores ───────────────────────────────────────
// En vez de exponer ZodError directo a la UI, lo normalizamos a un mapa
// {campo: mensaje} que el hook usa para feedback inline.
export interface ValidationResult {
    success: boolean;
    errors: Record<string, string>;       // campo → mensaje (1er error por campo)
    data?: EventosFiltrosValidos;
}

export const validarFiltros = (input: unknown): ValidationResult => {
    const parsed = eventosFiltrosSchema.safeParse(input);

    if (parsed.success) {
        return { success: true, errors: {}, data: parsed.data };
    }

    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
        const campo = issue.path[0]?.toString() ?? "_general";
        // Sólo guardamos el primer error por campo — la UI no debe inundar
        // al usuario con múltiples mensajes simultáneos (H8: estética y
        // minimalismo).
        if (!errors[campo]) errors[campo] = issue.message;
    }

    return { success: false, errors };
};