import { useEffect, useRef, useCallback } from "preact/hooks";
import { Chart, registerables } from "npm:chart.js";
import { ElevationPoint } from "../utils/types.ts";

// Registra i componenti necessari di Chart.js
Chart.register(...registerables);

interface ElevationChartProps {
  data: ElevationPoint[];
}

export default function ElevationChart({ data }: ElevationChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  // Renderizza il grafico con i dati di altitudine
  const renderChart = useCallback(() => {
    console.log("Rendering chart with data points:", data.length);
    
    if (!chartRef.current || data.length === 0) {
      console.log("Cannot render chart: missing canvas or data");
      return;
    }

    try {
      // Distruggi il grafico esistente se presente
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Prepara i dati per il grafico
      const labels = data.map((point) => point.distance.toFixed(1));
      const chartData = data.map((point) => point.elevation);

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
              data: chartData,
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
                label: function (context) {
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
  }, [data]);

  // Assicuriamoci che il grafico venga renderizzato quando il componente è montato o i dati cambiano
  useEffect(() => {
    if (data.length > 0) {
      console.log("Data changed, rendering chart");
      renderChart();
    }

    // Cleanup quando il componente viene smontato
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md" style={{ height: "400px" }}>
      <canvas ref={chartRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
