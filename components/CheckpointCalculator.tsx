import { useState, useEffect } from "preact/hooks";
import { ElevationPoint } from "../utils/types.ts";
import { Button } from "./Button.tsx";
import {
  calculateCheckpoints,
  Checkpoint as CheckpointType,
} from "../utils/timeCalculator.ts";
import {
  STORAGE_KEYS,
  saveToLocalStorage,
  loadFromLocalStorage,
} from "../utils/storage.ts";

interface CheckpointCalculatorProps {
  data: ElevationPoint[];
  basePaceValue: number | null;
}

export default function CheckpointCalculator({
  data,
  basePaceValue,
}: CheckpointCalculatorProps) {
  const [newPointKm, setNewPointKm] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [checkpoints, setCheckpoints] = useState<CheckpointType[]>([]);
  const [customCheckpoints, setCustomCheckpoints] = useState<number[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const totalDistance = data.length > 0 ? data[data.length - 1].distance : 0;

  // Carica i checkpoint salvati dal localStorage all'avvio
  useEffect(() => {
    const savedCheckpoints = loadFromLocalStorage(STORAGE_KEYS.CHECKPOINTS);
    if (savedCheckpoints) {
      try {
        const parsedCheckpoints = JSON.parse(savedCheckpoints);
        if (Array.isArray(parsedCheckpoints)) {
          // Verifica che i checkpoints salvati siano validi per questo percorso
          const validCheckpoints = parsedCheckpoints.filter(
            (cp) => cp <= totalDistance
          );
          setCustomCheckpoints(validCheckpoints);
        }
      } catch (error) {
        console.error("Errore nel parsing dei checkpoint salvati:", error);
      }
    }
  }, [totalDistance]);

  // Calcola i checkpoint predefiniti quando il ritmo base o i checkpoint personalizzati cambiano
  useEffect(() => {
    if (basePaceValue && customCheckpoints.length > 0) {
      const calculatedCheckpoints = calculateCheckpoints(
        data,
        basePaceValue,
        customCheckpoints
      );
      setCheckpoints(calculatedCheckpoints);
    } else {
      setCheckpoints([]);
    }
  }, [data, basePaceValue, customCheckpoints]);

  // Funzione per salvare i checkpoint nel localStorage
  const saveCheckpoints = (checkpoints: number[]) => {
    saveToLocalStorage(STORAGE_KEYS.CHECKPOINTS, JSON.stringify(checkpoints));
  };

  // Funzione per aggiungere un singolo punto
  const handleAddSinglePoint = () => {
    if (!newPointKm.trim()) {
      setErrorMessage("Inserisci un punto in km");
      return;
    }

    if (!basePaceValue) {
      setErrorMessage("Devi prima calcolare un ritmo o un tempo stimato");
      return;
    }

    try {
      const pointDistance = parseFloat(newPointKm.trim().replace(",", "."));

      if (isNaN(pointDistance) || pointDistance < 0) {
        setErrorMessage("Formato non valido. Inserisci un numero positivo");
        return;
      }

      // Controlla se il punto è all'interno del percorso
      if (pointDistance > totalDistance) {
        setErrorMessage(
          `Il punto ${pointDistance} km supera la lunghezza del percorso (${totalDistance.toFixed(
            2
          )} km)`
        );
        return;
      }

      // Controlla se il punto esiste già
      if (customCheckpoints.includes(pointDistance)) {
        setErrorMessage(`Il punto ${pointDistance} km esiste già`);
        return;
      }

      // Aggiungi il checkpoint all'elenco esistente
      const newCheckpoints = [...customCheckpoints, pointDistance].sort(
        (a, b) => a - b
      );

      setCustomCheckpoints(newCheckpoints);
      setNewPointKm("");
      setErrorMessage("");
      setShowAddForm(false);

      // Salva nel localStorage
      saveCheckpoints(newCheckpoints);
    } catch (error) {
      setErrorMessage("Errore nell'elaborazione del punto");
      console.error("Error parsing checkpoint:", error);
    }
  };

  // Genera checkpoint distanziati uniformemente
  const handleGenerateUniformCheckpoints = (numPoints: number) => {
    if (!basePaceValue || totalDistance <= 0) return;

    const checkpointDistances: number[] = [];
    const interval = totalDistance / (numPoints + 1);

    for (let i = 1; i <= numPoints; i++) {
      const distance = parseFloat((interval * i).toFixed(2));
      checkpointDistances.push(distance);
    }

    setCustomCheckpoints(checkpointDistances);
    setErrorMessage("");
    setShowAddForm(false);

    // Salva nel localStorage
    saveCheckpoints(checkpointDistances);
  };

  // Rimuove un checkpoint specifico
  const handleRemoveCheckpoint = (checkpoint: number) => {
    const updatedCheckpoints = customCheckpoints.filter(
      (cp) => cp !== checkpoint
    );
    setCustomCheckpoints(updatedCheckpoints);

    // Salva nel localStorage
    saveCheckpoints(updatedCheckpoints);
  };

  // Ripristina tutti i checkpoint
  const handleResetCheckpoints = () => {
    setCustomCheckpoints([]);
    setCheckpoints([]);
    setErrorMessage("");
    setShowAddForm(false);

    // Rimuovi dal localStorage
    saveCheckpoints([]);
  };

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Punti Intermedi</h3>
        <div className="flex items-center gap-2">
          {customCheckpoints.length > 0 && (
            <Button onClick={handleResetCheckpoints} small>
              Azzera
            </Button>
          )}
          <Button onClick={() => handleGenerateUniformCheckpoints(5)} small>
            5 punti equidistanti
          </Button>
        </div>
      </div>

      <div className="mt-2 mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Aggiungi punti intermedi per vedere i tempi previsti lungo il
          percorso.
        </p>

        {!showAddForm ? (
          <div className="flex justify-center">
            <button
              onClick={() => setShowAddForm(true)}
              className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shadow-md hover:bg-blue-600 transition-colors"
              title="Aggiungi punto"
            >
              <span className="text-xl">+</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2 p-3 bg-blue-50 rounded-lg">
            <div className="flex-grow">
              <label className="block text-sm text-gray-600 mb-1">
                Distanza (km)
              </label>
              <input
                type="text"
                value={newPointKm}
                onInput={(e) =>
                  setNewPointKm((e.target as HTMLInputElement).value)
                }
                placeholder="5.5"
                className="border border-gray-300 rounded px-3 py-2 w-full"
                disabled={!basePaceValue}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAddSinglePoint}
                disabled={!basePaceValue || !newPointKm.trim()}
              >
                Aggiungi
              </Button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setErrorMessage("");
                  setNewPointKm("");
                }}
                className="px-3 py-2 text-gray-500 hover:text-gray-700"
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
        )}
      </div>

      {checkpoints.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Km
                </th>
                <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Altitudine
                </th>
                <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Terreno
                </th>
                <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ritmo
                </th>
                <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tempo previsto
                </th>
                <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {checkpoints.map((checkpoint) => {
                // Determina il colore di sfondo in base al tipo di segmento
                let rowBgColor = "bg-white";
                if (checkpoint.segment === "Salita") {
                  rowBgColor = "bg-red-50";
                } else if (checkpoint.segment === "Discesa") {
                  rowBgColor = "bg-green-50";
                } else if (checkpoint.segment === "Pianura") {
                  rowBgColor = "bg-blue-50";
                } else if (checkpoint.segment === "Arrivo") {
                  rowBgColor = "bg-yellow-50";
                }

                return (
                  <tr key={checkpoint.distance} className={rowBgColor}>
                    <td className="py-3 px-3">
                      {checkpoint.distance.toFixed(2)} km
                    </td>
                    <td className="py-3 px-3">
                      {Math.round(checkpoint.elevation)} m
                    </td>
                    <td className="py-3 px-3">
                      {checkpoint.segment}
                      {checkpoint.grade !== undefined &&
                        checkpoint.grade !== 0 && (
                          <span className="ml-1 text-xs text-gray-500">
                            ({checkpoint.grade > 0 ? "+" : ""}
                            {checkpoint.grade.toFixed(1)}%)
                          </span>
                        )}
                    </td>
                    <td className="py-3 px-3">{checkpoint.formattedPace}</td>
                    <td className="py-3 px-3 font-medium">
                      {checkpoint.formattedTime}
                    </td>
                    <td className="py-3 px-3">
                      {checkpoint.segment !== "Arrivo" && (
                        <button
                          onClick={() =>
                            handleRemoveCheckpoint(checkpoint.distance)
                          }
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Rimuovi
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">
            Nessun punto intermedio definito. Clicca sul pulsante + per
            aggiungere punti.
          </p>
        </div>
      )}
    </div>
  );
}
