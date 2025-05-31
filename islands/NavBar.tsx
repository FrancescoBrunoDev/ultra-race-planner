// filepath: /workspaces/ultra-race-planner/islands/NavBar.tsx
import {
  STORAGE_KEYS,
  loadFromLocalStorage,
  saveToLocalStorage,
  removeFromLocalStorage,
} from "../utils/storage.ts";
import { useSignal } from "@preact/signals";
import { useEffect, useCallback } from "preact/hooks";
import FileUploader from "../components/FileUploader.tsx";
import { processGpxData } from "../utils/gpxProcessor.ts";

// Creiamo una funzione per aggiungere un listener agli eventi di storage
const createStorageListener = (callback: () => void) => {
  // Utilizziamo document per eventi personalizzati come soluzione alternativa
  document.addEventListener("gpx-file-state-changed", callback);
  return () => {
    document.removeEventListener("gpx-file-state-changed", callback);
  };
};

export default function NavBar() {
  const fileIsLoaded = useSignal<boolean>(false);
  const fileContent = useSignal<string | null>(null);
  const fileName = useSignal<string>("");

  // Funzione per notificare i cambiamenti di stato del file
  const notifyFileStateChange = () => {
    const event = new CustomEvent("gpx-file-state-changed");
    document.dispatchEvent(event);
  };

  // Gestisce il reset dei dati
  const handleReset = useCallback(() => {
    // Rimuovi i dati dal localStorage
    removeFromLocalStorage(STORAGE_KEYS.FILE_CONTENT);
    removeFromLocalStorage(STORAGE_KEYS.CHECKPOINTS);
    removeFromLocalStorage(STORAGE_KEYS.TARGET_TIME);
    removeFromLocalStorage(STORAGE_KEYS.USER_PACE);
    removeFromLocalStorage(STORAGE_KEYS.ESTIMATED_TIME);
    removeFromLocalStorage(STORAGE_KEYS.REQUIRED_PACE);
    removeFromLocalStorage(STORAGE_KEYS.BASE_PACE_VALUE);
    removeFromLocalStorage(STORAGE_KEYS.FILE_NAME);
    saveToLocalStorage(STORAGE_KEYS.FILE_IS_LOADED, "false");

    fileContent.value = null;
    fileIsLoaded.value = false;
    fileName.value = "";

    // Notifica il cambiamento di stato
    notifyFileStateChange();
  }, []);

  // Gestisce il caricamento del file
  const handleFileLoaded = useCallback(
    (content: string, uploadedFileName?: string) => {
      try {
        // Elabora il file GPX per verificare che sia valido
        processGpxData(content);

        // Se arriviamo qui, il file è valido
        fileContent.value = content;

        // Reimposta qualsiasi calcolo precedente quando si cambia file
        removeFromLocalStorage(STORAGE_KEYS.CHECKPOINTS);
        removeFromLocalStorage(STORAGE_KEYS.TARGET_TIME);
        removeFromLocalStorage(STORAGE_KEYS.USER_PACE);
        removeFromLocalStorage(STORAGE_KEYS.ESTIMATED_TIME);
        removeFromLocalStorage(STORAGE_KEYS.REQUIRED_PACE);
        removeFromLocalStorage(STORAGE_KEYS.BASE_PACE_VALUE);

        // Salva nel localStorage il nuovo file
        saveToLocalStorage(STORAGE_KEYS.FILE_CONTENT, content);
        saveToLocalStorage(STORAGE_KEYS.FILE_IS_LOADED, "true");

        // Salva anche il nome del file, se disponibile
        if (uploadedFileName) {
          fileName.value = uploadedFileName;
          saveToLocalStorage(STORAGE_KEYS.FILE_NAME, uploadedFileName);
        }

        fileIsLoaded.value = true;

        // Notifica il cambiamento di stato
        notifyFileStateChange();
      } catch (error) {
        console.error("Errore nell'elaborazione del file GPX:", error);
        alert(
          "Errore nell'elaborazione del file GPX. Verifica che il file sia valido."
        );
      }
    },
    []
  );

  // Controlla quando il componente viene montato
  useEffect(() => {
    // Funzione per controllare lo stato del file
    const checkFileLoadedState = () => {
      const loadedState = loadFromLocalStorage(STORAGE_KEYS.FILE_IS_LOADED);
      fileIsLoaded.value = loadedState === "true";

      // Se è caricato, ottieni anche il contenuto
      if (loadedState === "true") {
        fileContent.value = loadFromLocalStorage(STORAGE_KEYS.FILE_CONTENT);
        fileName.value = loadFromLocalStorage(STORAGE_KEYS.FILE_NAME) || "";
      }
    };

    // Controlla lo stato iniziale
    checkFileLoadedState();

    // Aggiungi un listener per i cambiamenti di stato
    const cleanupListener = createStorageListener(checkFileLoadedState);

    // Imposta un polling periodico per verificare i cambiamenti (fallback)
    const intervalId = setInterval(checkFileLoadedState, 1000);

    // Cleanup quando il componente viene smontato
    return () => {
      cleanupListener();
      clearInterval(intervalId);
    };
  }, []);

  if (fileIsLoaded.value === true) {
    return (
      <nav class="fixed top-0 left-0 w-full bg-white shadow-md z-50 px-4 backdrop-blur-2xl">
        <div class="max-w-6xl mx-auto flex justify-between items-center py-2">
          <h1 class="text-3xl font-bold text-green-700">UTRP</h1>
          <div class="flex items-center">
            <FileUploader
              onFileLoaded={handleFileLoaded}
              onReset={handleReset}
              hasFile={fileIsLoaded.value}
              compact={true}
              fileName={fileName.value}
            />
          </div>
        </div>
      </nav>
    );
  } else {
    return (
      <div class="w-full mb-10 text-center">
        <h1 class="text-4xl font-bold mb-2">UltraTrail Race Planner</h1>
        <p class="text-gray-600">
          Visualizza l'altitudine delle tue tracce GPX per pianificare le tue
          avventure
        </p>
      </div>
    );
  }
}
