import { gpx } from "npm:@tmcw/togeojson";
import { calculateDistance } from "./geo.ts";
import { ElevationPoint } from "./types.ts";

// Elabora il file GPX e ottiene i dati di altitudine
export function processGpxData(gpxString: string): ElevationPoint[] {
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxString, "text/xml");
    const geoJson = gpx(gpxDoc);

    if (geoJson.features.length === 0) {
        throw new Error("Nessun dato di traccia trovato nel file GPX");
    }

    // Controllo del tipo di geometria e estrazione delle coordinate
    const feature = geoJson.features[0];
    if (feature.geometry.type !== 'LineString') {
        throw new Error("Il file GPX non contiene una LineString valida");
    }

    const coordinates = feature.geometry.coordinates;
    let totalDistance = 0;
    const points: ElevationPoint[] = [];

    // Elabora i dati di altitudine e calcola la distanza progressiva
    for (let i = 0; i < coordinates.length; i++) {
        const [lon, lat, elevation] = coordinates[i];

        if (i > 0) {
            const [prevLon, prevLat] = coordinates[i - 1];
            const segmentDistance = calculateDistance(prevLat, prevLon, lat, lon);
            totalDistance += segmentDistance;
        }

        points.push({
            distance: totalDistance / 1000, // Converti in km
            elevation: elevation || 0,
        });
    }

    return points;
}
