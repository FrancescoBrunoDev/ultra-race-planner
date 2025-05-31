import { useState, useEffect } from "preact/hooks";
import { ElevationPoint } from "../utils/types.ts";
import {
  calculateEstimatedTime,
  calculateRequiredPace,
  formatPace,
  formatTime,
} from "../utils/timeCalculator.ts";
import { Button } from "../components/Button.tsx";
import PaceChart from "../components/PaceChart.tsx";
import CourseSplitChart from "../components/CourseSplitChart.tsx";
import CheckpointCalculator from "../components/CheckpointCalculator.tsx";
import {
  STORAGE_KEYS,
  saveToLocalStorage,
  loadFromLocalStorage,
} from "../utils/storage.ts";

interface TimeCalculatorProps {
  data: ElevationPoint[];
}

export default function TimeCalculator({ data }: TimeCalculatorProps) {
  const [targetTime, setTargetTime] = useState("06:30");
  const [requiredPace, setRequiredPace] = useState<string>("");
  const [estimatedTime, setEstimatedTime] = useState<string>("");
  const [estimatedTimeOptimistic, setEstimatedTimeOptimistic] =
    useState<string>("");
  const [estimatedTimePessimistic, setEstimatedTimePessimistic] =
    useState<string>("");
  const [userPace, setUserPace] = useState("");
  const [basePaceValue, setBasePaceValue] = useState<number | null>(null);
  const [showPaceChart, setShowPaceChart] = useState(false);
  const [showCourseSplit, setShowCourseSplit] = useState(false);
  const [activeTab, setActiveTab] = useState<"pace" | "split" | "checkpoints">(
    "pace"
  );
  // Memorizziamo i percorsi correnti per rilevare i cambiamenti
  const [currentDataChecksum, setCurrentDataChecksum] = useState<string>("");

  // Monitora i cambiamenti nei dati di input
  useEffect(() => {
    // Creiamo un checksum semplice basato sui primi e ultimi punti del percorso
    if (data && data.length > 0) {
      const startPoint = data[0];
      const endPoint = data[data.length - 1];
      const checksum = `${startPoint.distance}-${startPoint.elevation}-${endPoint.distance}-${endPoint.elevation}`;
      
      // Se il checksum è diverso, i dati sono cambiati (è stato caricato un nuovo file)
      if (checksum !== currentDataChecksum) {
        console.log("Rilevato nuovo percorso, resetting dei calcoli...");
        setCurrentDataChecksum(checksum);
        
        // Reimpostiamo lo stato interno per il nuovo percorso
        setRequiredPace("");
        setEstimatedTime("");
        setEstimatedTimeOptimistic("");
        setEstimatedTimePessimistic("");
      }
    }
  }, [data]);

  // Carica i valori salvati dal localStorage all'avvio del componente
  useEffect(() => {
    const savedTargetTime = loadFromLocalStorage(STORAGE_KEYS.TARGET_TIME);
    const savedUserPace = loadFromLocalStorage(STORAGE_KEYS.USER_PACE);
    const savedEstimatedTime = loadFromLocalStorage(
      STORAGE_KEYS.ESTIMATED_TIME
    );
    const savedRequiredPace = loadFromLocalStorage(STORAGE_KEYS.REQUIRED_PACE);
    const savedBasePaceValue = loadFromLocalStorage(
      STORAGE_KEYS.BASE_PACE_VALUE
    );

    if (savedTargetTime) {
      setTargetTime(savedTargetTime);
    }

    if (savedUserPace) {
      setUserPace(savedUserPace);
    }

    if (savedEstimatedTime) {
      setEstimatedTime(savedEstimatedTime);
    }

    if (savedRequiredPace) {
      setRequiredPace(savedRequiredPace);
    }

    // Carica il ritmo base se è disponibile e mostra i grafici
    if (savedBasePaceValue) {
      try {
        const paceValue = parseFloat(savedBasePaceValue);
        if (!isNaN(paceValue)) {
          setBasePaceValue(paceValue);
          setShowPaceChart(true);
          setShowCourseSplit(true);
        }
      } catch (error) {
        console.error("Errore nel parsing del ritmo base salvato:", error);
      }
    } else if (savedRequiredPace) {
      // Fallback: se abbiamo un ritmo salvato ma non il valore base, proviamo a calcolarlo
      try {
        const [min, sec] = savedRequiredPace.split(":").map(Number);
        if (!isNaN(min) && !isNaN(sec)) {
          const paceValue = min + sec / 60;
          setBasePaceValue(paceValue);
          setShowPaceChart(true);
          setShowCourseSplit(true);
        }
      } catch (error) {
        console.error("Errore nel parsing del ritmo salvato:", error);
      }
    }
  }, []);

  const totalDistance = data.length > 0 ? data[data.length - 1].distance : 0;

  // Calcola il dislivello totale positivo e negativo
  const calculateElevationStats = () => {
    let totalAscent = 0;
    let totalDescent = 0;

    if (data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        const elevDiff = data[i].elevation - data[i - 1].elevation;
        if (elevDiff > 0) {
          totalAscent += elevDiff;
        } else {
          totalDescent += Math.abs(elevDiff);
        }
      }
    }

    return { totalAscent, totalDescent };
  };

  const { totalAscent, totalDescent } = calculateElevationStats();

  // Salva il valore basePace ogni volta che cambia
  useEffect(() => {
    if (basePaceValue !== null) {
      saveToLocalStorage(
        STORAGE_KEYS.BASE_PACE_VALUE,
        basePaceValue.toString()
      );
    }
  }, [basePaceValue]);

  // Gestisce il calcolo del ritmo necessario per raggiungere l'obiettivo temporale
  const handleCalculateRequiredPace = () => {
    if (data.length < 2) return;

    // Converti il tempo obiettivo da HH:MM a minuti
    const [hours, minutes] = targetTime.split(":").map(Number);
    const targetTimeMinutes = hours * 60 + minutes;

    // Calcola il ritmo richiesto
    const pace = calculateRequiredPace(data, targetTimeMinutes);
    const formattedPace = formatPace(pace);
    setRequiredPace(formattedPace);
    setBasePaceValue(pace);
    setShowPaceChart(true);
    setShowCourseSplit(true);

    // Salva nel localStorage
    saveToLocalStorage(STORAGE_KEYS.TARGET_TIME, targetTime);
    saveToLocalStorage(STORAGE_KEYS.REQUIRED_PACE, formattedPace);
  };

  // Gestisce il calcolo del tempo stimato in base al ritmo inserito
  const handleCalculateTime = () => {
    if (data.length < 2 || !userPace) return;

    // Converti il ritmo da MM:SS a minuti
    const [minutes, seconds] = userPace.split(":").map(Number);
    const paceMinutes = minutes + seconds / 60;

    // Calcola il tempo stimato standard
    const timeMinutes = calculateEstimatedTime(data, paceMinutes);
    const formattedTime = formatTime(timeMinutes);

    // Calcola il tempo ottimistico (90% del tempo standard)
    const timeMinutesOptimistic = calculateEstimatedTime(
      data,
      paceMinutes,
      "optimistic"
    );
    const formattedTimeOptimistic = formatTime(timeMinutesOptimistic);

    // Calcola il tempo pessimistico (110% del tempo standard)
    const timeMinutesPessimistic = calculateEstimatedTime(
      data,
      paceMinutes,
      "pessimistic"
    );
    const formattedTimePessimistic = formatTime(timeMinutesPessimistic);

    // Aggiorna tutti gli stati
    setEstimatedTime(formattedTime);
    setEstimatedTimeOptimistic(formattedTimeOptimistic);
    setEstimatedTimePessimistic(formattedTimePessimistic);
    setBasePaceValue(paceMinutes);
    setShowPaceChart(true);
    setShowCourseSplit(true);

    // Salva nel localStorage
    saveToLocalStorage(STORAGE_KEYS.USER_PACE, userPace);
    saveToLocalStorage(STORAGE_KEYS.ESTIMATED_TIME, formattedTime);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mt-6">
      <h2 className="text-xl font-bold mb-4">Calcolo Tempo e Ritmo</h2>

      {/* Sommario del percorso */}
      <div className="bg-blue-50 p-3 rounded-lg mb-4">
        <div className="flex justify-between flex-wrap">
          <div className="mb-2">
            <span className="text-sm text-gray-600">Distanza totale:</span>
            <p className="font-bold">{totalDistance.toFixed(2)} km</p>
          </div>
          <div className="mb-2">
            <span className="text-sm text-gray-600">Dislivello positivo:</span>
            <p className="font-bold">{Math.round(totalAscent)} m</p>
          </div>
          <div className="mb-2">
            <span className="text-sm text-gray-600">Dislivello negativo:</span>
            <p className="font-bold">{Math.round(totalDescent)} m</p>
          </div>
        </div>
        <p className="text-sm italic">
          I calcoli includono l'effetto del dislivello sulla velocità
        </p>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          Calcola il ritmo necessario
        </h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Tempo obiettivo (ore:minuti)
            </label>
            <input
              type="text"
              value={targetTime}
              onInput={(e) =>
                setTargetTime((e.target as HTMLInputElement).value)
              }
              placeholder="06:30"
              pattern="[0-9]{1,2}:[0-9]{2}"
              className="border border-gray-300 rounded px-3 py-2 w-24"
            />
          </div>

          <Button onClick={handleCalculateRequiredPace}>Calcola ritmo</Button>

          {requiredPace && (
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                Per completare {totalDistance.toFixed(2)} km in {targetTime}
              </p>
              <p className="font-bold text-green-600">
                Ritmo necessario: {requiredPace}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold mb-2">Calcola il tempo stimato</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Il tuo ritmo (min:sec per km)
            </label>
            <input
              type="text"
              value={userPace}
              onInput={(e) => setUserPace((e.target as HTMLInputElement).value)}
              placeholder="5:30"
              pattern="[0-9]{1,2}:[0-9]{2}"
              className="border border-gray-300 rounded px-3 py-2 w-24"
            />
          </div>

          <Button onClick={handleCalculateTime}>Calcola tempo</Button>

          {estimatedTime && (
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                Con un ritmo di {userPace} min/km su {totalDistance.toFixed(2)}{" "}
                km
              </p>
              <p className="font-bold text-green-600">
                Tempo stimato: {estimatedTime}
              </p>
              <div className="flex flex-col gap-1 mt-2">
                <p className="text-xs text-blue-600">
                  <span className="font-semibold">Stima ottimistica:</span>{" "}
                  {estimatedTimeOptimistic}
                </p>
                <p className="text-xs text-red-600">
                  <span className="font-semibold">Stima pessimistica:</span>{" "}
                  {estimatedTimePessimistic}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                (Considerando {Math.round(totalAscent)}m D+ e{" "}
                {Math.round(totalDescent)}m D-)
              </p>
              <p className="text-xs italic mt-1">
                Le stime ottimistiche/pessimistiche considerano ±0.5% del tempo
                calcolato
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tab per i grafici e checkpoint */}
      {(showPaceChart || showCourseSplit) && basePaceValue && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <div className="mb-4 border-b">
            <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
              <li className="mr-2">
                <button
                  onClick={() => setActiveTab("pace")}
                  className={`inline-block p-4 rounded-t-lg ${
                    activeTab === "pace"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "hover:text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Ritmo per segmento
                </button>
              </li>
              <li className="mr-2">
                <button
                  onClick={() => setActiveTab("split")}
                  className={`inline-block p-4 rounded-t-lg ${
                    activeTab === "split"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "hover:text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Suddivisione tratti
                </button>
              </li>
              <li className="mr-2">
                <button
                  onClick={() => setActiveTab("checkpoints")}
                  className={`inline-block p-4 rounded-t-lg ${
                    activeTab === "checkpoints"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "hover:text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Punti intermedi
                </button>
              </li>
            </ul>
          </div>

          {activeTab === "pace" && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Il grafico mostra il ritmo previsto in ogni segmento del
                percorso in base alla pendenza. Le barre rosse/arancioni
                indicano ritmi più lenti (salite), mentre quelle verdi/blu
                indicano ritmi più veloci o normali. La linea viola mostra la
                pendenza in ogni punto.
              </p>
              <PaceChart
                data={data}
                basePace={basePaceValue}
                showGrade={true}
              />
            </div>
          )}

          {activeTab === "split" && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Qui puoi vedere il percorso suddiviso in tratti di salita,
                discesa e pianura. Per ogni tratto è indicata la distanza
                (barre), il tempo stimato (linea), il dislivello e la pendenza
                media.
              </p>
              <CourseSplitChart data={data} basePace={basePaceValue} />
            </div>
          )}

          {activeTab === "checkpoints" && (
            <div>
              <CheckpointCalculator data={data} basePaceValue={basePaceValue} />
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-3 bg-yellow-50 rounded-lg text-sm">
        <p>
          <strong>Come funziona:</strong> Il calcolatore tiene conto del
          dislivello del percorso. Le salite rallentano il ritmo (fino a +50%
          per pendenze estreme), mentre le discese lo accelerano (fino a -20%
          per discese ripide). Ogni segmento del percorso viene analizzato
          separatamente in base alla pendenza.
        </p>
        <p className="mt-2">
          <strong>Stime multiple:</strong> Oltre alla stima standard, il
          simulatore fornisce anche una stima ottimistica (10% più veloce) e una
          pessimistica (10% più lenta) per aiutarti a pianificare considerando
          diversi scenari possibili.
        </p>
      </div>
    </div>
  );
}
