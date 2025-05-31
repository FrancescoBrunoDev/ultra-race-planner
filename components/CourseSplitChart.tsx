import { useEffect, useRef, useCallback } from "preact/hooks";
import { Chart, registerables } from "npm:chart.js";
import { ElevationPoint } from "../utils/types.ts";
import { calculateSegmentPaces } from "../utils/timeCalculator.ts";

// Registra i componenti necessari di Chart.js
Chart.register(...registerables);

interface CourseSectionData {
  type: "uphill" | "downhill" | "flat";
  startDistance: number;
  endDistance: number;
  startElevation: number;
  endElevation: number;
  totalDistance: number;
  elevationChange: number;
  averageGrade: number;
  avgPace: number;
  estimatedTime: number; // in minuti
  points: ElevationPoint[];
}

interface CourseSplitChartProps {
  data: ElevationPoint[];
  basePace?: number; // Ritmo base in min/km
}

export default function CourseSplitChart({ data, basePace = 5.0 }: CourseSplitChartProps) {
  const uphillChartRef = useRef<HTMLCanvasElement>(null);
  const downhillChartRef = useRef<HTMLCanvasElement>(null);
  const uphillChartInstance = useRef<Chart | null>(null);
  const downhillChartInstance = useRef<Chart | null>(null);
  
  // Funzione per formattare il tempo (hh:mm o mm:ss)
  const formatTime = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return `${hours}h ${mins}m`;
    } else {
      const mins = Math.floor(minutes);
      const secs = Math.round((minutes - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  };
  
  // Identifica i segmenti in salita e discesa
  const identifySegments = useCallback((): CourseSectionData[] => {
    if (data.length < 2) return [];
    
    const sections: CourseSectionData[] = [];
    let currentType: "uphill" | "downhill" | "flat" | null = null;
    let sectionPoints: ElevationPoint[] = [data[0]];
    const _sectionStart = 0; // Definisco la variabile sectionStart ma con prefisso underscore per evitare avvisi
    const flatThreshold = 1; // Consideriamo piatto se la pendenza è tra -1% e 1%
    
    // Calcola i ritmi per ogni segmento
    const pacePoints = calculateSegmentPaces(data, basePace);
    
    for (let i = 1; i < data.length; i++) {
      const prev = data[i-1];
      const current = data[i];
      const segmentDistance = current.distance - prev.distance;
      const elevationChange = current.elevation - prev.elevation;
      const grade = segmentDistance > 0 ? (elevationChange / (segmentDistance * 1000)) * 100 : 0;
      
      let segmentType: "uphill" | "downhill" | "flat";
      if (grade > flatThreshold) {
        segmentType = "uphill";
      } else if (grade < -flatThreshold) {
        segmentType = "downhill";
      } else {
        segmentType = "flat";
      }
      
      // Se è il primo punto o se è cambiato il tipo di segmento
      if (currentType === null || (currentType !== segmentType && 
          // Ignora piccoli cambiamenti per evitare segmenti troppo brevi
          (sectionPoints.length > 3 || Math.abs(grade) > 3))) {
        
        // Salva il segmento precedente se non è il primo punto
        if (currentType !== null) {
          const first = sectionPoints[0];
          const last = sectionPoints[sectionPoints.length - 1];
          const sectionDistance = last.distance - first.distance;
          const sectionElevation = last.elevation - first.elevation;
          
          // Calcola il ritmo medio di questo segmento
          let totalSegmentTime = 0;
          let avgPace = basePace;
          
          if (sectionDistance > 0) {
            // Trova i punti di ritmo corrispondenti a questo segmento
            const startIndex = data.findIndex(p => p === first);
            const relevantPacePoints = pacePoints.slice(startIndex, startIndex + sectionPoints.length);
            
            if (relevantPacePoints.length > 0) {
              const totalPace = relevantPacePoints.reduce((sum, point) => sum + point.pace, 0);
              avgPace = totalPace / relevantPacePoints.length;
              totalSegmentTime = sectionDistance * avgPace;
            } else {
              // Fallback se non troviamo i punti di ritmo
              totalSegmentTime = sectionDistance * basePace;
            }
          }
          
          sections.push({
            type: currentType,
            startDistance: first.distance,
            endDistance: last.distance,
            startElevation: first.elevation,
            endElevation: last.elevation,
            totalDistance: sectionDistance,
            elevationChange: sectionElevation,
            averageGrade: sectionDistance > 0 ? (sectionElevation / (sectionDistance * 1000)) * 100 : 0,
            avgPace,
            estimatedTime: totalSegmentTime,
            points: [...sectionPoints]
          });
        }
        
        currentType = segmentType;
        // Non usiamo più sectionStart qui poiché non è necessario
        sectionPoints = [prev];
      }
      
      sectionPoints.push(current);
    }
    
    // Aggiungi l'ultimo segmento
    if (sectionPoints.length > 1) {
      const first = sectionPoints[0];
      const last = sectionPoints[sectionPoints.length - 1];
      const sectionDistance = last.distance - first.distance;
      const sectionElevation = last.elevation - first.elevation;
      
      // Calcola il ritmo medio di questo segmento
      let totalSegmentTime = 0;
      let avgPace = basePace;
      
      if (sectionDistance > 0) {
        const startIndex = data.findIndex(p => p === first);
        const relevantPacePoints = pacePoints.slice(startIndex, startIndex + sectionPoints.length - 1);
        
        if (relevantPacePoints.length > 0) {
          const totalPace = relevantPacePoints.reduce((sum, point) => sum + point.pace, 0);
          avgPace = totalPace / relevantPacePoints.length;
          totalSegmentTime = sectionDistance * avgPace;
        } else {
          totalSegmentTime = sectionDistance * basePace;
        }
      }
      
      sections.push({
        type: currentType!,
        startDistance: first.distance,
        endDistance: last.distance,
        startElevation: first.elevation,
        endElevation: last.elevation,
        totalDistance: sectionDistance,
        elevationChange: sectionElevation,
        averageGrade: sectionDistance > 0 ? (sectionElevation / (sectionDistance * 1000)) * 100 : 0,
        avgPace,
        estimatedTime: totalSegmentTime,
        points: [...sectionPoints]
      });
    }
    
    return sections;
  }, [data, basePace]);
  
  // Renderizza i grafici per tratti in salita e discesa
  const renderCharts = useCallback(() => {
    if ((data.length < 2) || !uphillChartRef.current || !downhillChartRef.current) {
      return;
    }
    
    try {
      // Distruggi i grafici esistenti se presenti
      if (uphillChartInstance.current) {
        uphillChartInstance.current.destroy();
        uphillChartInstance.current = null;
      }
      if (downhillChartInstance.current) {
        downhillChartInstance.current.destroy();
        downhillChartInstance.current = null;
      }
      
      // Ottieni i segmenti
      const allSegments = identifySegments();
      
      // Filtra i segmenti in salita e discesa (includi anche i tratti pianeggianti in entrambi)
      const uphillSegments = allSegments.filter(s => s.type === "uphill" || s.type === "flat");
      const downhillSegments = allSegments.filter(s => s.type === "downhill" || s.type === "flat");
      
      // Funzione per creare il grafico per un tipo di segmento
      const createChart = (
        segments: CourseSectionData[], 
        chartRef: { current: HTMLCanvasElement | null }, 
        instanceRef: { current: Chart | null },
        title: string,
        barColor: string
      ) => {
        if (!chartRef.current || segments.length === 0) return;
        
        const ctx = chartRef.current.getContext("2d");
        if (!ctx) return;
        
        // Prepara i dati per il grafico
        const labels = segments.map((segment, _idx) => 
          `${segment.startDistance.toFixed(1)}-${segment.endDistance.toFixed(1)} km`
        );
        
        const distanceData = segments.map(s => s.totalDistance);
        const gradeData = segments.map(s => Math.abs(s.averageGrade).toFixed(1));
        const elevationData = segments.map(s => Math.abs(s.elevationChange));
        const timeData = segments.map(s => s.estimatedTime);
        const paceData = segments.map(s => s.avgPace);
        
        instanceRef.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: "Distanza (km)",
                data: distanceData,
                backgroundColor: barColor,
                borderColor: barColor,
                borderWidth: 1,
                yAxisID: 'y',
              },
              {
                label: "Tempo stimato (min)",
                data: timeData,
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1,
                yAxisID: 'y2',
                type: 'line'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                title: {
                  display: true,
                  text: "Distanza (km)",
                },
                position: 'left',
              },
              y2: {
                title: {
                  display: true,
                  text: "Tempo (min)",
                },
                position: 'right',
                grid: {
                  drawOnChartArea: false,
                }
              }
            },
            plugins: {
              title: {
                display: true,
                text: title,
                font: { size: 16 },
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    const datasetLabel = context.dataset.label || '';
                    const value = context.parsed.y;
                    const idx = context.dataIndex;
                    
                    if (datasetLabel === "Distanza (km)") {
                      return [
                        `${datasetLabel}: ${value.toFixed(2)} km`,
                        `Dislivello: ${Math.abs(elevationData[idx]).toFixed(0)} m`,
                        `Pendenza: ${gradeData[idx]}%`,
                        `Ritmo: ${formatTime(paceData[idx])} min/km`
                      ];
                    } else if (datasetLabel === "Tempo stimato (min)") {
                      return `${datasetLabel}: ${formatTime(value)}`;
                    }
                    return `${datasetLabel}: ${value}`;
                  }
                }
              }
            }
          }
        });
      };
      
      // Crea i grafici per salite e discese
      createChart(
        uphillSegments, 
        uphillChartRef, 
        uphillChartInstance,
        "Tratti in Salita e Pianeggianti",
        'rgba(255, 99, 132, 0.7)'  // Rosso per le salite
      );
      
      createChart(
        downhillSegments, 
        downhillChartRef, 
        downhillChartInstance,
        "Tratti in Discesa e Pianeggianti",
        'rgba(75, 192, 192, 0.7)'  // Verde per le discese
      );
      
    } catch (error) {
      console.error("Error rendering course split charts:", error);
    }
  }, [data, basePace, identifySegments]);
  
  // Renderizziamo i grafici quando i dati o il ritmo base cambiano
  useEffect(() => {
    if (data.length > 1) {
      renderCharts();
    }
    
    // Pulizia
    return () => {
      if (uphillChartInstance.current) {
        uphillChartInstance.current.destroy();
      }
      if (downhillChartInstance.current) {
        downhillChartInstance.current.destroy();
      }
    };
  }, [data, basePace, renderCharts]);
  
  // Riepilogo dei segmenti
  const segments = data.length > 1 ? identifySegments() : [];
  const uphillSegments = segments.filter(s => s.type === "uphill");
  const downhillSegments = segments.filter(s => s.type === "downhill");
  const flatSegments = segments.filter(s => s.type === "flat");
  
  const totalUphillDistance = uphillSegments.reduce((sum, s) => sum + s.totalDistance, 0);
  const totalDownhillDistance = downhillSegments.reduce((sum, s) => sum + s.totalDistance, 0);
  const totalFlatDistance = flatSegments.reduce((sum, s) => sum + s.totalDistance, 0);
  
  const totalUphillElevation = uphillSegments.reduce((sum, s) => sum + s.elevationChange, 0);
  const totalDownhillElevation = downhillSegments.reduce((sum, s) => sum + Math.abs(s.elevationChange), 0);
  
  const totalUphillTime = uphillSegments.reduce((sum, s) => sum + s.estimatedTime, 0);
  const totalDownhillTime = downhillSegments.reduce((sum, s) => sum + s.estimatedTime, 0);
  const totalFlatTime = flatSegments.reduce((sum, s) => sum + s.estimatedTime, 0);
  
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Riepilogo Segmenti</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Riepilogo Salite */}
          <div className="bg-red-50 p-3 rounded-lg border border-red-100">
            <h4 className="font-medium text-red-800">Tratti in Salita</h4>
            <div className="mt-2 space-y-1">
              <p><span className="text-gray-600">Distanza:</span> <strong>{totalUphillDistance.toFixed(2)} km</strong></p>
              <p><span className="text-gray-600">Dislivello:</span> <strong>{totalUphillElevation.toFixed(0)} m</strong></p>
              <p><span className="text-gray-600">Tempo stimato:</span> <strong>{formatTime(totalUphillTime)}</strong></p>
              <p><span className="text-gray-600">Num. segmenti:</span> <strong>{uphillSegments.length}</strong></p>
            </div>
          </div>
          
          {/* Riepilogo Discese */}
          <div className="bg-green-50 p-3 rounded-lg border border-green-100">
            <h4 className="font-medium text-green-800">Tratti in Discesa</h4>
            <div className="mt-2 space-y-1">
              <p><span className="text-gray-600">Distanza:</span> <strong>{totalDownhillDistance.toFixed(2)} km</strong></p>
              <p><span className="text-gray-600">Dislivello:</span> <strong>{totalDownhillElevation.toFixed(0)} m</strong></p>
              <p><span className="text-gray-600">Tempo stimato:</span> <strong>{formatTime(totalDownhillTime)}</strong></p>
              <p><span className="text-gray-600">Num. segmenti:</span> <strong>{downhillSegments.length}</strong></p>
            </div>
          </div>
          
          {/* Riepilogo Pianeggiante */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <h4 className="font-medium text-blue-800">Tratti Pianeggianti</h4>
            <div className="mt-2 space-y-1">
              <p><span className="text-gray-600">Distanza:</span> <strong>{totalFlatDistance.toFixed(2)} km</strong></p>
              <p><span className="text-gray-600">Tempo stimato:</span> <strong>{formatTime(totalFlatTime)}</strong></p>
              <p><span className="text-gray-600">Num. segmenti:</span> <strong>{flatSegments.length}</strong></p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {/* Grafico Salite */}
        <div className="bg-white p-4 rounded-lg shadow-md" style={{ height: "350px" }}>
          <canvas ref={uphillChartRef} style={{ width: "100%", height: "100%" }} />
        </div>
        
        {/* Grafico Discese */}
        <div className="bg-white p-4 rounded-lg shadow-md" style={{ height: "350px" }}>
          <canvas ref={downhillChartRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
    </div>
  );
}
