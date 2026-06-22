import type { KmlImportResult, LatLng, Parada } from "../types/route.types";

// Parser de archivos KML
const ALIAS_NOMBRE = ["nombre", "name", "title", "label"];
const ALIAS_DIRECCION = ["direccion", "address", "street", "domicilio"];

export function parseKmlRoute(rawKml: string): KmlImportResult {
    const text = (rawKml || "").trim();
    if (!text) {
        return { trace: [], waypoints: [], warnings: ["El archivo KML está vacío."] };
    }

    const warnings: string[] = [];

    // 1. Extraer el trazo (primer LineString del archivo)
    const lineCoords = extractFirstLineString(text);
    const trace = parseCoordinatesBlock(lineCoords);
    if (trace.length === 0) {
        warnings.push("El KML no contiene una línea de ruta (LineString) válida.");
    }

    // 2. Extraer las paradas (cada Placemark con un Point)
    const placemarks = extractPlacemarks(text);
    const waypoints = placemarks
        .map((pm, index) => placemarkToParada(pm, index))
        .filter((p): p is Parada => p !== null);

    if (waypoints.length === 0) {
        warnings.push("El KML no contiene puntos de parada (Point).");
    }

    return { trace, waypoints, warnings };
}

// Helpers de extracción

// Saca las coordenadas del primer <LineString> del documento
function extractFirstLineString(kml: string): string {
    const match = kml.match(
        /<LineString[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/LineString>/i,
    );
    return match?.[1]?.trim() ?? "";
}

// Saca cada bloque Placemark
function extractPlacemarks(kml: string): string[] {
    return kml.match(/<Placemark[\s\S]*?<\/Placemark>/gi) ?? [];
}

// Convierte un bloque de coordenadas en array de LatLng
function parseCoordinatesBlock(block: string): LatLng[] {
    if (!block) return [];
    return block
        .split(/\s+/)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map(parseCoordinate)
        .filter((point): point is LatLng => point !== null);
}

// Una sola coordenada KML viene como lng,lat,altura
function parseCoordinate(value: string): LatLng | null {
    const [lngRaw, latRaw] = value.split(",");
    if (!lngRaw || !latRaw) return null;
    const lng = Number(lngRaw);
    const lat = Number(latRaw);
    // Descartar coordenadas invalidas o fuera de rango
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
}

// Convierte un Placemark con Point en una Parada del formulario
function placemarkToParada(placemark: string, index: number): Parada | null {
    const pointCoords = placemark.match(
        /<Point[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/Point>/i,
    )?.[1];

    const position = parseCoordinate((pointCoords ?? "").trim());
    if (!position) return null; // si no tiene Point, no es una parada

    const name = readTag(placemark, "name");
    const description = readTag(placemark, "description");
    const extendedData = readExtendedData(placemark);

    const nombre = pickAlias(extendedData, ALIAS_NOMBRE) || name || `Parada ${index + 1}`;
    const direccion = pickAlias(extendedData, ALIAS_DIRECCION) || description || "";

    return {
        id: `kml-stop-${index + 1}`,
        numero: index + 1,
        nombre,
        direccion,
        latitud: position.lat,
        longitud: position.lng,
        tipo_geocerca: "circular",
        radio: 100, // radio por defecto, el usuario puede ajustarlo
    };
}

// Lee el contenido de un tag simple, ej: <name>...</name>
function readTag(source: string, tag: string): string {
    const match = source.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return decodeXml((match?.[1] ?? "").trim());
}

// Lee los pares <Data name="x"><value>y</value></Data> y <SimpleData>
function readExtendedData(source: string): Record<string, string> {
    const result: Record<string, string> = {};

    const dataRegex =
        /<Data\s+name=["']([^"']+)["'][\s\S]*?<value>([\s\S]*?)<\/value>[\s\S]*?<\/Data>/gi;
    let m: RegExpExecArray | null = dataRegex.exec(source);
    while (m) {
        const key = (m[1] ?? "").trim().toLowerCase();
        const val = decodeXml((m[2] ?? "").trim());
        if (key && val) result[key] = val;
        m = dataRegex.exec(source);
    }

    const simpleRegex =
        /<SimpleData\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/SimpleData>/gi;
    let s: RegExpExecArray | null = simpleRegex.exec(source);
    while (s) {
        const key = (s[1] ?? "").trim().toLowerCase();
        const val = decodeXml((s[2] ?? "").trim());
        if (key && val) result[key] = val;
        s = simpleRegex.exec(source);
    }

    return result;
}

// Busca el primer alias que tenga valor
function pickAlias(values: Record<string, string>, aliases: string[]): string | undefined {
    for (const alias of aliases) {
        const value = values[alias.toLowerCase()];
        if (value) return value;
    }
    return undefined;
}

// Decodifica entidades XML básicas
function decodeXml(value: string): string {
    return value
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
}