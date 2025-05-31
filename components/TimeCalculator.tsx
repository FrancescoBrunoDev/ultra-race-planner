import { useState } from "preact/hooks";
import { ElevationPoint } from "../utils/types.ts";
import { calculateEstimatedTime, calculateRequiredPace, formatPace, formatTime } from "../utils/timeCalculator.ts";
import { Button } from "../components/Button.tsx";

interface TimeCalculatorProps {
  data: ElevationPoint[];
}

export default function TimeCalculator({ data }: TimeCalculatorProps) {
  const [targetTime, setTargetTime] = useState("06:30");
  const [requiredPace, setRequiredPace] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [userPace, setUserPace] = useState("");
  
  const totalDistance = data.length > 0 ? data[data.length - 1].distance : 0;
  
  // Gestisce il calcolo del ritmo necessario per raggiungere l'obiettivo temporale
  const handleCalculateRequiredPace = () => {
    if (data.length < 2) return;
    
    // Converti il tempo obiettivo da HH:MM a minuti
    const [hours, minutes] = targetTime.split(":").map(Number);
    const targetTimeMinutes = (hours * 60) + minutes;
    
    // Calcola il ritmo richiesto
    const pace = calculateRequiredPace(data, targetTimeMinutes);
    setRequiredPace(formatPace(pace));
  };
  
  // Gestisce il calcolo del tempo stimato in base al ritmo inserito
  const handleCalculateTime = () => {
    if (data.length < 2 || !userPace) return;
    
    // Converti il ritmo da MM:SS a minuti
    const [minutes, seconds] = userPace.split(":").map(Number);
    const paceMinutes = minutes + (seconds / 60);
    
    // Calcola il tempo stimato
    const timeMinutes = calculateEstimatedTime(data, paceMinutes);
    setEstimatedTime(formatTime(timeMinutes));
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md mt-6">
      <h2 className="text-xl font-bold mb-4">Calcolo Tempo e Ritmo</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Calcola il ritmo necessario</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Tempo obiettivo (ore:minuti)
            </label>
            <input
              type="text"
              value={targetTime}
              onInput={(e) => setTargetTime((e.target as HTMLInputElement).value)}
              placeholder="06:30"
              pattern="[0-9]{1,2}:[0-9]{2}"
              className="border border-gray-300 rounded px-3 py-2 w-24"
            />
          </div>
          
          <Button onClick={handleCalculateRequiredPace}>
            Calcola ritmo
          </Button>
          
          {requiredPace && (
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Per completare {totalDistance.toFixed(2)} km in {targetTime}</p>
              <p className="font-bold text-green-600">Ritmo necessario: {requiredPace}</p>
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
          
          <Button onClick={handleCalculateTime}>
            Calcola tempo
          </Button>
          
          {estimatedTime && (
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Con un ritmo di {userPace} min/km su {totalDistance.toFixed(2)} km</p>
              <p className="font-bold text-green-600">Tempo stimato: {estimatedTime}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6 text-sm text-gray-500">
        <p>
          <strong>Nota:</strong> Le stime considerano il dislivello del percorso. 
          Le salite rallentano il ritmo (fino a +50% per pendenze estreme), 
          mentre le discese lo accelerano (fino a -20% per discese ripide).
        </p>
      </div>
    </div>
  );
}
