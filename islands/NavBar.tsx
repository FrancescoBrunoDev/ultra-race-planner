import { STORAGE_KEYS, loadFromLocalStorage } from "../utils/storage.ts";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

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

  // Controlla quando il componente viene montato
  useEffect(() => {
    // Funzione per controllare lo stato del file
    const checkFileLoadedState = () => {
      const loadedState = loadFromLocalStorage(STORAGE_KEYS.FILE_IS_LOADED);
      fileIsLoaded.value = loadedState === "true";
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
      <nav class="fixed top-0 left-0 w-full bg-white z-50 px-4 backdrop-blur-2xl">
        <div class="">
          <h1 class="text-4xl font-bold">UTRP</h1>
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
