/**
 * excel-lazy.ts — Carga perezosa de ExcelJS y file-saver.
 *
 * Por qué existe: ExcelJS pesa ~650 kB empaquetado. Importado estáticamente
 * convertía a AforosPage en un chunk de 991 kB que TODO usuario descargaba
 * al entrar a la página, aunque jamás exportara ni importara un Excel.
 * Con el import dinámico, la librería se descarga la PRIMERA vez que
 * alguien usa exportar/importar (y el navegador la cachea para las
 * siguientes) — el usuario que solo consulta nunca paga el costo.
 *
 * Único punto permitido para importar ExcelJS/file-saver: cualquier módulo
 * nuevo que necesite Excel debe usar estos helpers, nunca el import
 * estático (que revive el chunk gigante en silencio).
 */

/** Carga ExcelJS bajo demanda. El navegador cachea el chunk tras el primer uso. */
export const cargarExcelJS = async () => {
    const modulo = await import("exceljs");
    return modulo.default;
};

/** Carga file-saver bajo demanda y descarga el blob con el nombre dado. */
export const descargarBlob = async (blob: Blob, nombre: string) => {
    const { saveAs } = await import("file-saver");
    saveAs(blob, nombre);
};
