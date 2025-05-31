import { JSX } from "preact";

interface FileUploaderProps {
  onFileLoaded: (content: string) => void;
  onReset?: () => void;
  hasFile: boolean;
  compact?: boolean; // Per versione compatta nella navbar
}

export default function FileUploader({
  onFileLoaded,
  onReset,
  hasFile,
  compact = false,
}: FileUploaderProps) {
  // Gestisce il caricamento del file
  const handleFileChange = (
    event: JSX.TargetedEvent<HTMLInputElement, Event>
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          onFileLoaded(content);
        }
      };
      reader.readAsText(file);
    }
  };

  // Versione compatta per la navbar
  if (compact) {
    return (
      <div className="flex items-center">
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
        {hasFile && onReset && (
          <button
            onClick={onReset}
            className="ml-2 py-1 px-3 bg-red-50 text-red-700 rounded-md text-sm font-semibold hover:bg-red-100"
          >
            Reset
          </button>
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
      <div className="mt-4 flex items-center">
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
        {hasFile && onReset && (
          <button
            onClick={onReset}
            className="ml-2 py-2 px-4 bg-red-50 text-red-700 rounded-md text-sm font-semibold hover:bg-red-100"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
