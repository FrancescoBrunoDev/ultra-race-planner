import { useEffect, useRef, useCallback } from "preact/hooks";
import { Chart, registerables } from "npm:chart.js";
import type { ChartDataset, ChartTypeRegistry } from "npm:chart.js";
import { ElevationPoint } from "../utils/types.ts";
import { calculateSegmentPaces } from "../utils/timeCalculator.ts";

// Registra i componenti necessari di Chart.js
Chart.register(...registerables);

interface PaceChartProps {
  data: ElevationPoint[];
  basePace?: number; // Ritmo base in min/km
  showGrade?: boolean; // Se mostrare anche la pendenza
}

export default function PaceChart({ data, basePace = 5.0, showGrade = true }: PaceChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  // Funzione per formattare il ritmo (min:sec)
  const formatPaceForLabel = (pace: number) => {
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Renderizza il grafico con i dati di altitudine
  const renderChart = useCallback(() => {
    if (!chartRef.current || data.length < 2) {
      return;
    }

    try {
      // Distruggi il grafico esistente se presente
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Calcola il ritmo per ogni segmento
      const pacePoints = calculateSegmentPaces(data, basePace);

      // Prepara i dati per il grafico
      const labels = pacePoints.map((point) => point.distance.toFixed(1));
      const paceData = pacePoints.map((point) => point.pace);
      const gradeData = pacePoints.map((point) => point.grade);

      // Colori per il ritmo basati sul valore
      const paceColors = paceData.map(pace => {
        // Più il ritmo è lento (alto), più il colore tende al rosso
        if (pace > basePace * 1.3) return 'rgba(255, 99, 132, 0.8)';  // Rosso (molto lento)
        if (pace > basePace * 1.15) return 'rgba(255, 159, 64, 0.8)';  // Arancione (lento)
        if (pace < basePace * 0.85) return 'rgba(75, 192, 192, 0.8)';  // Verde acqua (veloce)
        return 'rgba(54, 162, 235, 0.8)';  // Blu (normale)
      });

      // Crea il nuovo grafico
      const ctx = chartRef.current.getContext("2d");
      if (!ctx) {
        console.error("Failed to get canvas context");
        return;
      }

      const datasets: ChartDataset<keyof ChartTypeRegistry, number[]>[] = [
        {
          label: "Ritmo (min/km)",
          data: paceData,
          backgroundColor: paceColors,
          borderColor: paceColors,
          borderWidth: 2,
          type: 'bar',
          yAxisID: 'y',
        }
      ];

      if (showGrade) {
        datasets.push({
          label: "Pendenza (%)",
          data: gradeData,
          borderColor: Array(gradeData.length).fill('rgba(153, 102, 255, 1)'),
          borderWidth: 2,
          type: 'line',
          yAxisID: 'y1',
          pointRadius: 0 as unknown as undefined,
          fill: false,
          tension: 0.1,
        });
      }

      chartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets,
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
                text: "Ritmo (min/km)",
              },
              min: Math.min(...paceData) * 0.9,  // Aggiungi un po' di margine sotto
              max: Math.max(...paceData) * 1.05, // Aggiungi un po' di spazio sopra
            },
            y1: {
              display: showGrade,
              position: 'right',
              title: {
                display: true,
                text: "Pendenza (%)",
              },
              grid: {
                drawOnChartArea: false,
              },
            }
          },
          plugins: {
            title: {
              display: true,
              text: "Ritmo previsto per segmento",
              font: {
                size: 16,
              },
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const datasetLabel = context.dataset.label || '';
                  const value = context.parsed.y;
                  
                  if (datasetLabel === "Ritmo (min/km)") {
                    return `${datasetLabel}: ${formatPaceForLabel(value)} min/km`;
                  } else if (datasetLabel === "Pendenza (%)") {
                    return `${datasetLabel}: ${value.toFixed(1)}%`;
                  }
                  return `${datasetLabel}: ${value}`;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error("Error rendering pace chart:", error);
    }
  }, [data, basePace, showGrade]);

  // Renderizziamo il grafico quando i dati o il ritmo base cambiano
  useEffect(() => {
    if (data.length > 1) {
      renderChart();
    }

    // Pulizia
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, basePace, showGrade]);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md" style={{ height: "350px" }}>
      <canvas ref={chartRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
