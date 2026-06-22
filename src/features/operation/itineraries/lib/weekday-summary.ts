//   [1,2,3,4,5]     → "Lun a Vie"
//   [1,2,3,4,5,6,0] → "Lun a Dom"
//   [1,3,5]         → "Lun · Mié · Vie"
//   [6,0]           → "Sáb a Dom"
//   []              → "Sin días"
import type { DiaSemana } from "../types/itinerary.types";
import { DIA_LABEL } from "../types/itinerary.types";

// Orden visual de la semana: lunes primero, domingo al final
const ORDEN_SEMANA: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0];

export const formatWeekdaySummary = (dias: DiaSemana[]): string => {
    if (!dias || dias.length === 0) return "Sin días";

    // Ordenar según el orden visual de la semana
    const ordenados = ORDEN_SEMANA.filter((d) => dias.includes(d));

    // Detectar rangos consecutivos
    const rangos: Array<[DiaSemana, DiaSemana]> = [];
    let inicio = ordenados[0];
    let fin = ordenados[0];

    for (let i = 1; i < ordenados.length; i++) {
        const actual = ordenados[i];
        const idxFin = ORDEN_SEMANA.indexOf(fin);
        const idxActual = ORDEN_SEMANA.indexOf(actual);

        if (idxActual === idxFin + 1) {
            // Día consecutivo — extender el rango
            fin = actual;
        } else {
            // Hueco — cerrar rango y abrir uno nuevo
            rangos.push([inicio, fin]);
            inicio = actual;
            fin = actual;
        }
    }
    rangos.push([inicio, fin]);

    return rangos
        .map(([a, b]) => (a === b ? DIA_LABEL[a] : `${DIA_LABEL[a]} a ${DIA_LABEL[b]}`))
        .join(" · ");
};