import { useSignal } from "@preact/signals";
import { useCallback, useEffect, useRef } from "preact/hooks";
import { Chart, registerables } from "npm:chart.js";
import { gpx } from "npm:@tmcw/togeojson";

// Registra i componenti necessari di Chart.js
Chart.register(...registerables);

interface ElevationPoint {
  distance: number;
  elevation: number;
}

export default function GpxVisualizer() {
  const fileContent = useSignal<string | null>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const elevationData = useSignal<ElevationPoint[]>([]);

  // Funzione per calcolare la distanza tra due punti geografici (in metri)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Raggio della Terra in metri
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Elabora il file GPX e ottiene i dati di altitudine
  const processGpxData = useCallback((gpxString: string) => {
    try {
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

      elevationData.value = points;
      
      // Assicuriamoci che il grafico sia renderizzato dopo che i dati sono stati aggiornati
      setTimeout(() => renderChart(), 0);
    } catch (error) {
      console.error("Errore nell'elaborazione del file GPX:", error);
      alert("Errore nell'elaborazione del file GPX. Verifica che il file sia valido.");
    }
  }, []);

  // Renderizza il grafico con i dati di altitudine
  const renderChart = useCallback(() => {
    console.log("Rendering chart with data points:", elevationData.value.length);
    
    if (!chartRef.current || elevationData.value.length === 0) {
      console.log("Cannot render chart: missing canvas or data");
      return;
    }

    try {
      // Distruggi il grafico esistente se presente
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Prepara i dati per il grafico
      const labels = elevationData.value.map((point) => point.distance.toFixed(1));
      const data = elevationData.value.map((point) => point.elevation);

      // Crea il nuovo grafico
      const ctx = chartRef.current.getContext("2d");
      if (!ctx) {
        console.error("Failed to get canvas context");
        return;
      }

      chartInstance.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Altitudine (m)",
              data,
              fill: true,
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1,
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              title: {
                display: true,
                text: "Distanza (km)",
              },
            },
            y: {
              title: {
                display: true,
                text: "Altitudine (m)",
              },
            },
          },
          plugins: {
            title: {
              display: true,
              text: "Profilo di altitudine",
              font: {
                size: 16,
              },
            },
            tooltip: {
              callbacks: {
                label: function (context: any) {
                  return `Altitudine: ${context.parsed.y} m | Distanza: ${context.parsed.x} km`;
                },
              },
            },
          },
        },
      });
      console.log("Chart successfully rendered");
    } catch (error) {
      console.error("Error rendering chart:", error);
    }
  }, [elevationData.value]);

  // Assicuriamoci che il grafico venga renderizzato quando il componente è montato
  useEffect(() => {
    if (elevationData.value.length > 0) {
      console.log("Component mounted with data, rendering chart");
      renderChart();
    }
  }, []);

  // Gestisce il caricamento del file
  const handleFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        fileContent.value = content;
        processGpxData(content);
      };
      reader.readAsText(file);
    }
  };

  // Statistiche di riepilogo
  const ElevationSummary = () => {
    if (elevationData.value.length === 0) return null;

    const elevations = elevationData.value.map((point) => point.elevation);
    const maxElevation = Math.max(...elevations);
    const minElevation = Math.min(...elevations);
    const totalDistance = elevationData.value[elevationData.value.length - 1].distance;

    // Calcola il dislivello totale in salita
    let totalAscent = 0;
    for (let i = 1; i < elevationData.value.length; i++) {
      const elevationDiff = elevationData.value[i].elevation - elevationData.value[i - 1].elevation;
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
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Visualizzatore di tracce GPX</h2>
        <p className="text-gray-600 mb-4">
          Carica un file GPX per visualizzare il profilo di altitudine della traccia.
        </p>
        <div className="mt-4">
          <input
            type="file"
            accept=".gpx"
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-green-50 file:text-green-700
              hover:file:bg-green-100"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {elevationData.value.length > 0 && (
        <>
          <div className="p-4 bg-white rounded-lg shadow-md" style={{ height: "400px" }}>
            <canvas ref={chartRef} style={{ width: "100%", height: "100%" }} />
          </div>
          <ElevationSummary />
        </>
      )}

      {elevationData.value.length === 0 && fileContent.value && (
        <div className="text-center py-8">
          <p className="text-red-500">
            Nessun dato di altitudine trovato nel file. Assicurati che il file GPX contenga informazioni di elevazione.
          </p>
        </div>
      )}
      
      {!fileContent.value && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-md">
          <p className="text-gray-500">
            Nessun file caricato. Seleziona un file GPX per iniziare.
          </p>
        </div>
      )}
    </div>
  );
}
