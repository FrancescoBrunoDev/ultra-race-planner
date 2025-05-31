import { useSignal } from "@preact/signals";
import { useCallback, useEffect } from "preact/hooks";
import {
  STORAGE_KEYS,
  saveToLocalStorage,
  loadFromLocalStorage,
  removeFromLocalStorage,
} from "../utils/storage.ts";
import { processGpxData } from "../utils/gpxProcessor.ts";
import { ElevationPoint } from "../utils/types.ts";
import ElevationChart from "../components/ElevationChart.tsx";
import ElevationSummary from "../components/ElevationSummary.tsx";
import TimeCalculator from "../components/TimeCalculator.tsx";
import FileUploader from "../components/FileUploader.tsx";

export default function GpxVisualizer() {
  const fileContent = useSignal<string | null>(null);
  const elevationData = useSignal<ElevationPoint[]>([]);

  // Funzione per notificare i cambiamenti di stato del file
  const notifyFileStateChange = () => {
    const event = new CustomEvent("gpx-file-state-changed");
    document.dispatchEvent(event);
  };

  // Elabora il file GPX
  const handleGpxProcess = useCallback((gpxString: string) => {
    try {
      const points = processGpxData(gpxString);
      elevationData.value = points;

      // Salva nel Local Storage
      saveToLocalStorage(STORAGE_KEYS.FILE_CONTENT, gpxString);
      saveToLocalStorage(STORAGE_KEYS.FILE_IS_LOADED, "true"); // Indica che un file è stato caricato

      // Notifica il cambiamento di stato
      notifyFileStateChange();
    } catch (error) {
      console.error("Errore nell'elaborazione del file GPX:", error);
      alert(
        "Errore nell'elaborazione del file GPX. Verifica che il file sia valido."
      );
    }
  }, []);

  // Gestisce il reset dei dati
  const handleReset = useCallback(() => {
    removeFromLocalStorage(STORAGE_KEYS.FILE_CONTENT);
    removeFromLocalStorage(STORAGE_KEYS.CHECKPOINTS);
    removeFromLocalStorage(STORAGE_KEYS.TARGET_TIME);
    removeFromLocalStorage(STORAGE_KEYS.USER_PACE);
    removeFromLocalStorage(STORAGE_KEYS.ESTIMATED_TIME);
    removeFromLocalStorage(STORAGE_KEYS.REQUIRED_PACE);
    removeFromLocalStorage(STORAGE_KEYS.BASE_PACE_VALUE);
    saveToLocalStorage(STORAGE_KEYS.FILE_IS_LOADED, "false");
    fileContent.value = null;
    elevationData.value = [];

    // Notifica il cambiamento di stato
    notifyFileStateChange();
  }, []);

  // Funzione per ascoltare gli eventi di file caricato/resettato
  const checkFileLoadedState = useCallback(() => {
    const loadedState = loadFromLocalStorage(STORAGE_KEYS.FILE_IS_LOADED);
    const savedContent = loadFromLocalStorage(STORAGE_KEYS.FILE_CONTENT);

    if (loadedState === "true" && savedContent) {
      fileContent.value = savedContent;

      // Elabora i dati GPX se non sono già elaborati
      if (elevationData.value.length === 0) {
        try {
          const points = processGpxData(savedContent);
          elevationData.value = points;
        } catch (error) {
          console.error("Errore nell'elaborazione del file GPX:", error);
        }
      }
    } else {
      fileContent.value = null;
      elevationData.value = [];
    }
  }, []);

  // Carica i dati dal LocalStorage al primo caricamento e configura i listener
  useEffect(() => {
    // Controlla subito lo stato del file
    checkFileLoadedState();

    // Configura un listener per gli eventi di cambiamento dello stato del file
    const handleFileStateChange = () => {
      checkFileLoadedState();
    };

    document.addEventListener("gpx-file-state-changed", handleFileStateChange);

    // Cleanup
    return () => {
      document.removeEventListener(
        "gpx-file-state-changed",
        handleFileStateChange
      );
    };
  }, []); // Solo al primo montaggio del componente

  return (
    <div className={`max-w-6xl mx-auto ${fileContent.value ? "mt-8" : ""}`}>
      {/* FileUploader mostrato solo se non c'è ancora un file caricato */}
      {!fileContent.value && (
        <FileUploader
          onFileLoaded={(content) => {
            fileContent.value = content;
            handleGpxProcess(content);
          }}
          onReset={handleReset}
          hasFile={false}
        />
      )}

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
            Nessun dato di altitudine trovato nel file. Assicurati che il file
            GPX contenga informazioni di elevazione.
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
