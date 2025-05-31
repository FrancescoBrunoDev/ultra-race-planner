import { ElevationPoint } from "../utils/types.ts";

interface ElevationSummaryProps {
  data: ElevationPoint[];
}

export default function ElevationSummary({ data }: ElevationSummaryProps) {
  if (data.length === 0) return null;

  const elevations = data.map((point) => point.elevation);
  const maxElevation = Math.max(...elevations);
  const minElevation = Math.min(...elevations);
  const totalDistance = data[data.length - 1].distance;

  // Calcola il dislivello totale in salita
  let totalAscent = 0;
  for (let i = 1; i < data.length; i++) {
    const elevationDiff = data[i].elevation - data[i - 1].elevation;
    if (elevationDiff > 0) {
      totalAscent += elevationDiff;
    }
  }

  return (
    <div className="mt-6 p-4 bg-gray-100 rounded-md">
      <h3 className="text-lg font-semibold mb-2">Riepilogo</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p>Distanza totale: {totalDistance.toFixed(2)} km</p>
          <p>Altitudine massima: {maxElevation.toFixed(0)} m</p>
        </div>
        <div>
          <p>Dislivello positivo: {totalAscent.toFixed(0)} m</p>
          <p>Altitudine minima: {minElevation.toFixed(0)} m</p>
        </div>
      </div>
    </div>
  );
}
