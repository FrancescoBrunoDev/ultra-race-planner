import { JSX } from "preact";
import { useState, useEffect } from "preact/hooks";

interface FileUploaderProps {
  onFileLoaded: (content: string, fileName?: string) => void;
  onReset?: () => void;
  hasFile: boolean;
  compact?: boolean; // Per versione compatta nella navbar
  fileName?: string; // Nome del file caricato (opzionale)
}

export default function FileUploader({
  onFileLoaded,
  onReset,
  hasFile,
  compact = false,
  fileName: externalFileName,
}: FileUploaderProps) {
  // State per memorizzare il nome del file caricato
  const [fileName, setFileName] = useState<string>(externalFileName || "");
  
  // Aggiorna il nome del file quando cambia la prop esterna
  useEffect(() => {
    if (externalFileName) {
      setFileName(externalFileName);
    }
  }, [externalFileName]);
  // Gestisce il caricamento del file
  const handleFileChange = (
    event: JSX.TargetedEvent<HTMLInputElement, Event>
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (file) {
      // Salva il nome del file
      const fileNameToSave = file.name;
      setFileName(fileNameToSave);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          // Passa sia il contenuto che il nome del file
          onFileLoaded(content, fileNameToSave);
        }
      };
      reader.readAsText(file);
    }
  };

  // Versione compatta per la navbar
  if (compact) {
    return (
      <div className="flex items-center">
        {hasFile ? (
          <div className="flex items-center">
            <span className="text-sm text-green-600 font-medium mr-2">
              {fileName ? (
                <span title={fileName}>
                  File: <strong className="font-bold">{fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName}</strong>
                </span>
              ) : (
                'File GPX caricato'
              )}
            </span>
            <button
              onClick={() => {
                const fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.accept = ".gpx";
                fileInput.onchange = (e) =>
                  handleFileChange(
                    e as unknown as JSX.TargetedEvent<HTMLInputElement, Event>
                  );
                fileInput.click();
              }}
              className="py-1 px-3 bg-green-50 text-green-700 rounded-md text-sm font-semibold hover:bg-green-100"
            >
              Cambia
            </button>
            {onReset && (
              <button
                onClick={onReset}
                className="ml-2 py-1 px-3 bg-red-50 text-red-700 rounded-md text-sm font-semibold hover:bg-red-100"
              >
                Reset
              </button>
            )}
          </div>
        ) : (
          <input
            type="file"
            accept=".gpx"
            className="text-sm text-gray-500
              file:mr-2 file:py-1 file:px-3
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-green-50 file:text-green-700
              hover:file:bg-green-100"
            onChange={handleFileChange}
          />
        )}
      </div>
    );
  }

  // Versione standard
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold mb-2">Visualizzatore di tracce GPX</h2>
      <p className="text-gray-600 mb-4">
        Carica un file GPX per visualizzare il profilo di altitudine della
        traccia.
      </p>
      <div className="mt-4">
        {hasFile ? (
          <div className="flex items-center bg-green-50 p-4 rounded-lg">
            <div className="flex-grow">
              <div className="text-green-700 font-medium mb-1">
                File GPX caricato con successo!
              </div>
              {fileName && (
                <p className="text-sm font-mono bg-green-100 px-2 py-1 rounded mb-1 inline-block">
                  {fileName}
                </p>
              )}
              <p className="text-sm text-green-600 block">
                Il profilo di altitudine è visualizzato qui sotto.
              </p>
            </div>
            <div className="flex items-center ml-4">
              <button
                onClick={() => {
                  const fileInput = document.createElement("input");
                  fileInput.type = "file";
                  fileInput.accept = ".gpx";
                  fileInput.onchange = (e) =>
                    handleFileChange(
                      e as unknown as JSX.TargetedEvent<HTMLInputElement, Event>
                    );
                  fileInput.click();
                }}
                className="py-2 px-4 bg-white text-green-700 border border-green-500 rounded-md text-sm font-semibold hover:bg-green-100"
              >
                Cambia file
              </button>
              {onReset && (
                <button
                  onClick={onReset}
                  className="ml-2 py-2 px-4 bg-red-50 text-red-700 rounded-md text-sm font-semibold hover:bg-red-100"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center">
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
        )}
      </div>
    </div>
  );
}
