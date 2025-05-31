// Costante per le chiavi di Local Storage
export const STORAGE_KEYS = {
    FILE_CONTENT: "gpx-visualizer-file-content",
    // In futuro altre chiavi possono essere aggiunte qui
};

// Funzione per salvare dati nel localStorage
export const saveToLocalStorage = (key: string, value: string) => {
    try {
        if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
            localStorage.setItem(key, value);
        }
    } catch (error) {
        console.error(`Errore nel salvataggio dei dati in localStorage (${key}):`, error);
    }
};

// Funzione per caricare dati dal localStorage
export const loadFromLocalStorage = (key: string): string | null => {
    try {
        if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
            return localStorage.getItem(key);
        }
        return null;
    } catch (error) {
        console.error(`Errore nel caricamento dei dati da localStorage (${key}):`, error);
        return null;
    }
};

// Funzione per rimuovere dati dal localStorage
export const removeFromLocalStorage = (key: string): void => {
    try {
        if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
            localStorage.removeItem(key);
        }
    } catch (error) {
        console.error(`Errore nella rimozione dei dati da localStorage (${key}):`, error);
    }
};
