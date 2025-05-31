import { useSignal } from "@preact/signals";
import { useCallback, useEffect } from "preact/hooks";
import { STORAGE_KEYS, saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage } from "../utils/storage.ts";
import { processGpxData } from "../utils/gpxProcessor.ts";
import { ElevationPoint } from "../utils/types.ts";
import ElevationChart from "../components/ElevationChart.tsx";
import ElevationSummary from "../components/ElevationSummary.tsx";
import TimeCalculator from "../components/TimeCalculator.tsx";
import FileUploader from "../components/FileUploader.tsx";

export default function GpxVisualizer() {
  const fileContent = useSignal<string | null>(null);
  const elevationData = useSignal<ElevationPoint[]>([]);

  // Elabora il file GPX
  const handleGpxProcess = useCallback((gpxString: string) => {
    try {
      const points = processGpxData(gpxString);
      elevationData.value = points;
      
      // Salva nel Local Storage
      saveToLocalStorage(STORAGE_KEYS.FILE_CONTENT, gpxString);
    } catch (error) {
      console.error("Errore nell'elaborazione del file GPX:", error);
      alert("Errore nell'elaborazione del file GPX. Verifica che il file sia valido.");
    }
  }, []);

  // Gestisce il reset dei dati
  const handleReset = useCallback(() => {
    removeFromLocalStorage(STORAGE_KEYS.FILE_CONTENT);
    fileContent.value = null;
    elevationData.value = [];
  }, []);

  // Carica i dati dal LocalStorage al primo caricamento
  useEffect(() => {
    const savedContent = loadFromLocalStorage(STORAGE_KEYS.FILE_CONTENT);
    if (savedContent) {
      fileContent.value = savedContent;
      handleGpxProcess(savedContent);
      console.log("Dati GPX ripristinati dal localStorage");
    }
  }, []); // Solo al primo montaggio del componente

  return (
    <div className="max-w-4xl mx-auto p-4">
      <FileUploader 
        onFileLoaded={(content) => {
          fileContent.value = content;
          handleGpxProcess(content);
        }}
        onReset={handleReset}
        hasFile={fileContent.value !== null}
      />

      {elevationData.value.length > 0 && (
        <>
          <ElevationChart data={elevationData.value} />
          <ElevationSummary data={elevationData.value} />
          <TimeCalculator data={elevationData.value} />
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
