import { ElevationPoint } from "./types.ts";

// Fattori di correzione per salite e discese basati sulla pendenza
// I valori sono moltiplicatori di tempo rispetto al piano (1.0)
interface GradeFactors {
  [key: string]: number;
}

const UPHILL_FACTORS: GradeFactors = {
  "0-5": 1.05,    // Pendenza leggera: +5%
  "5-10": 1.15,   // Pendenza moderata: +15%
  "10-15": 1.25,  // Pendenza ripida: +25%
  "15-20": 1.35,  // Pendenza molto ripida: +35%
  "20+": 1.50,    // Pendenza estrema: +50%
};

const DOWNHILL_FACTORS: GradeFactors = {
  "0-5": 0.95,    // Discesa leggera: -5%
  "5-10": 0.90,   // Discesa moderata: -10%
  "10-15": 0.85,  // Discesa ripida: -15%
  "15-20": 0.82,  // Discesa molto ripida: -18%
  "20+": 0.80,    // Discesa estrema: -20%
};

/**
 * Calcola il tempo stimato per completare un percorso in base alla distanza,
 * dislivello e ritmo base (pace)
 * 
 * @param points - Array di punti di elevazione con dati di distanza
 * @param basePaceMinPerKm - Ritmo base in minuti per km (su terreno pianeggiante)
 * @returns Tempo totale stimato in minuti
 */
export function calculateEstimatedTime(
  points: ElevationPoint[],
  basePaceMinPerKm: number
): number {
  if (points.length < 2) return 0;

  let totalTimeMinutes = 0;

  for (let i = 1; i < points.length; i++) {
    const current = points[i];
    const prev = points[i - 1];

    // Calcola segmento di distanza in km
    const segmentDistance = current.distance - prev.distance;

    // Calcola il dislivello del segmento
    const elevationChange = current.elevation - prev.elevation;

    // Calcola la pendenza in percentuale
    const grade = segmentDistance > 0 ? (elevationChange / (segmentDistance * 1000)) * 100 : 0;

    // Determina il fattore di correzione basato sulla pendenza
    let paceFactor = 1.0; // Fattore neutro per terreno pianeggiante

    if (grade > 0) {
      // Salita
      if (grade <= 5) paceFactor = UPHILL_FACTORS["0-5"];
      else if (grade <= 10) paceFactor = UPHILL_FACTORS["5-10"];
      else if (grade <= 15) paceFactor = UPHILL_FACTORS["10-15"];
      else if (grade <= 20) paceFactor = UPHILL_FACTORS["15-20"];
      else paceFactor = UPHILL_FACTORS["20+"];
    } else if (grade < 0) {
      // Discesa
      const absGrade = Math.abs(grade);
      if (absGrade <= 5) paceFactor = DOWNHILL_FACTORS["0-5"];
      else if (absGrade <= 10) paceFactor = DOWNHILL_FACTORS["5-10"];
      else if (absGrade <= 15) paceFactor = DOWNHILL_FACTORS["10-15"];
      else if (absGrade <= 20) paceFactor = DOWNHILL_FACTORS["15-20"];
      else paceFactor = DOWNHILL_FACTORS["20+"];
    }

    // Calcola il tempo per questo segmento considerando il fattore di pendenza
    const segmentTimeMinutes = segmentDistance * basePaceMinPerKm * paceFactor;
    totalTimeMinutes += segmentTimeMinutes;
  }

  return totalTimeMinutes;
}

/**
 * Calcola il ritmo necessario per completare il percorso in un tempo target
 * 
 * @param points - Array di punti di elevazione con dati di distanza
 * @param targetTimeMinutes - Tempo obiettivo in minuti
 * @returns Ritmo base necessario in minuti per km
 */
export function calculateRequiredPace(
  points: ElevationPoint[],
  targetTimeMinutes: number
): number {
  // Usa un algoritmo di approssimazione per trovare il ritmo base
  // che produce un tempo totale vicino al tempo obiettivo

  if (points.length < 2 || targetTimeMinutes <= 0) return 0;

  // Stima iniziale: ritmo medio semplice (senza considerare il dislivello)
  const totalDistance = points[points.length - 1].distance;
  let pace = targetTimeMinutes / totalDistance;

  // Affina il ritmo tramite approssimazioni successive
  const MAX_ITERATIONS = 10;
  const TOLERANCE = 0.5; // Tolleranza di 30 secondi

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const estimatedTime = calculateEstimatedTime(points, pace);
    const timeDiff = estimatedTime - targetTimeMinutes;

    // Se siamo dentro la tolleranza, abbiamo trovato il ritmo
    if (Math.abs(timeDiff) < TOLERANCE) break;

    // Aggiusta il ritmo: se il tempo stimato è maggiore, diminuisci il ritmo
    // se è minore, aumenta il ritmo
    const adjustmentFactor = 1 - (timeDiff / estimatedTime) * 0.5; // Fattore di aggiustamento del 50%
    pace *= adjustmentFactor;
  }

  return pace;
}

/**
 * Formatta il tempo in ore e minuti
 * 
 * @param totalMinutes - Tempo totale in minuti
 * @returns Stringa formattata come "Xh Ym"
 */
export function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Formatta il ritmo in minuti:secondi per km
 * 
 * @param paceMinPerKm - Ritmo in minuti per km
 * @returns Stringa formattata come "X:YY min/km"
 */
export function formatPace(paceMinPerKm: number): string {
  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`;
}

/**
 * Calcola il ritmo per ogni segmento del percorso
 * 
 * @param points - Array di punti di elevazione con dati di distanza
 * @param basePaceMinPerKm - Ritmo base in minuti per km (su terreno pianeggiante)
 * @returns Array di punti con distanza e ritmo per ogni segmento
 */
export interface PacePoint {
  distance: number;    // in km
  pace: number;        // in min/km
  grade: number;       // pendenza in %
  paceFactor: number;  // fattore moltiplicatore
}

export function calculateSegmentPaces(
  points: ElevationPoint[],
  basePaceMinPerKm: number
): PacePoint[] {
  if (points.length < 2) return [];

  const pacePoints: PacePoint[] = [];

  for (let i = 1; i < points.length; i++) {
    const current = points[i];
    const prev = points[i - 1];

    // Calcola segmento di distanza in km
    const segmentDistance = current.distance - prev.distance;

    // Calcola il dislivello del segmento
    const elevationChange = current.elevation - prev.elevation;

    // Calcola la pendenza in percentuale
    const grade = segmentDistance > 0 ? (elevationChange / (segmentDistance * 1000)) * 100 : 0;

    // Determina il fattore di correzione basato sulla pendenza
    let paceFactor = 1.0; // Fattore neutro per terreno pianeggiante

    if (grade > 0) {
      // Salita
      if (grade <= 5) paceFactor = UPHILL_FACTORS["0-5"];
      else if (grade <= 10) paceFactor = UPHILL_FACTORS["5-10"];
      else if (grade <= 15) paceFactor = UPHILL_FACTORS["10-15"];
      else if (grade <= 20) paceFactor = UPHILL_FACTORS["15-20"];
      else paceFactor = UPHILL_FACTORS["20+"];
    } else if (grade < 0) {
      // Discesa
      const absGrade = Math.abs(grade);
      if (absGrade <= 5) paceFactor = DOWNHILL_FACTORS["0-5"];
      else if (absGrade <= 10) paceFactor = DOWNHILL_FACTORS["5-10"];
      else if (absGrade <= 15) paceFactor = DOWNHILL_FACTORS["10-15"];
      else if (absGrade <= 20) paceFactor = DOWNHILL_FACTORS["15-20"];
      else paceFactor = DOWNHILL_FACTORS["20+"];
    }

    // Calcola il ritmo effettivo per questo segmento
    const segmentPace = basePaceMinPerKm * paceFactor;

    // Aggiungi il punto al risultato (usiamo la distanza finale del segmento)
    pacePoints.push({
      distance: current.distance,
      pace: segmentPace,
      grade,
      paceFactor
    });
  }

  return pacePoints;
}

/**
 * Rappresenta un punto di controllo con informazioni sul tempo e ritmo
 */
export interface Checkpoint {
  distance: number;      // km
  elevation: number;     // m
  totalTime: number;     // minuti
  formattedTime: string; // formato "Xh Ym" o "Xh Ym Zs"
  pace: number;          // min/km
  formattedPace: string; // formato "X:YY min/km"
  grade?: number;        // pendenza % (opzionale)
  segment?: string;      // descrizione del segmento (opzionale)
}

/**
 * Calcola il tempo e il ritmo a punti specifici del percorso
 * 
 * @param points - Array di punti di elevazione con dati di distanza
 * @param basePaceMinPerKm - Ritmo base in minuti per km
 * @param checkpointDistances - Array di distanze (in km) per i punti di controllo
 * @returns Array di checkpoint con informazioni sul tempo e ritmo
 */
export function calculateCheckpoints(
  points: ElevationPoint[],
  basePaceMinPerKm: number,
  checkpointDistances: number[]
): Checkpoint[] {
  if (points.length < 2) return [];

  const checkpoints: Checkpoint[] = [];
  let totalTimeMinutes = 0;
  let lastCheckpointIndex = 0;

  // Ordina i punti di controllo
  const sortedCheckpoints = [...checkpointDistances].sort((a, b) => a - b);

  // Verifica che i punti di controllo siano all'interno del percorso
  const totalDistance = points[points.length - 1].distance;
  const validCheckpoints = sortedCheckpoints.filter(cp => cp <= totalDistance);

  // Calcola il tempo progressivo per ogni segmento
  for (let i = 1; i < points.length; i++) {
    const current = points[i];
    const prev = points[i - 1];

    // Calcola segmento di distanza in km
    const segmentDistance = current.distance - prev.distance;

    // Calcola il dislivello del segmento
    const elevationChange = current.elevation - prev.elevation;

    // Calcola la pendenza in percentuale
    const grade = segmentDistance > 0 ? (elevationChange / (segmentDistance * 1000)) * 100 : 0;

    // Determina il fattore di correzione basato sulla pendenza
    let paceFactor = 1.0; // Fattore neutro per terreno pianeggiante

    if (grade > 0) {
      // Salita
      if (grade <= 5) paceFactor = UPHILL_FACTORS["0-5"];
      else if (grade <= 10) paceFactor = UPHILL_FACTORS["5-10"];
      else if (grade <= 15) paceFactor = UPHILL_FACTORS["10-15"];
      else if (grade <= 20) paceFactor = UPHILL_FACTORS["15-20"];
      else paceFactor = UPHILL_FACTORS["20+"];
    } else if (grade < 0) {
      // Discesa
      const absGrade = Math.abs(grade);
      if (absGrade <= 5) paceFactor = DOWNHILL_FACTORS["0-5"];
      else if (absGrade <= 10) paceFactor = DOWNHILL_FACTORS["5-10"];
      else if (absGrade <= 15) paceFactor = DOWNHILL_FACTORS["10-15"];
      else if (absGrade <= 20) paceFactor = DOWNHILL_FACTORS["15-20"];
      else paceFactor = DOWNHILL_FACTORS["20+"];
    }

    // Calcola il ritmo effettivo per questo segmento
    const segmentPace = basePaceMinPerKm * paceFactor;

    // Calcola il tempo per questo segmento
    const segmentTimeMinutes = segmentDistance * segmentPace;
    totalTimeMinutes += segmentTimeMinutes;

    // Verifica se ci sono checkpoint in questo segmento
    for (let j = lastCheckpointIndex; j < validCheckpoints.length; j++) {
      const checkpointDistance = validCheckpoints[j];

      // Se il checkpoint è in questo segmento
      if (checkpointDistance <= current.distance && checkpointDistance > prev.distance) {
        // Interpola per trovare l'elevazione e il tempo esatto al checkpoint
        const ratio = (checkpointDistance - prev.distance) / segmentDistance;
        const checkpointElevation = prev.elevation + (ratio * elevationChange);

        // Calcola il tempo al checkpoint
        const distanceFromPrev = checkpointDistance - prev.distance;
        const timeToCheckpoint = distanceFromPrev * segmentPace;
        const checkpointTotalTime = totalTimeMinutes - segmentTimeMinutes + timeToCheckpoint;

        // Determina il tipo di segmento (salita, discesa o pianura)
        let segment = "";

        if (grade > 1) {
          segment = "Salita";
        } else if (grade < -1) {
          segment = "Discesa";
        } else {
          segment = "Pianura";
        }

        const checkpoint: Checkpoint = {
          distance: checkpointDistance,
          elevation: checkpointElevation,
          totalTime: checkpointTotalTime,
          formattedTime: formatTime(checkpointTotalTime),
          pace: segmentPace,
          formattedPace: formatPace(segmentPace),
          grade,
          segment
        };

        checkpoints.push(checkpoint);
        lastCheckpointIndex = j + 1;
      }
    }

    // Se abbiamo controllato tutti i checkpoint, possiamo interrompere il ciclo
    if (lastCheckpointIndex >= validCheckpoints.length) break;
  }

  // Aggiungi anche un checkpoint per il traguardo se non è già incluso
  if (validCheckpoints[validCheckpoints.length - 1] < totalDistance) {
    const finalTime = calculateEstimatedTime(points, basePaceMinPerKm);
    const avgPace = finalTime / totalDistance;

    checkpoints.push({
      distance: totalDistance,
      elevation: points[points.length - 1].elevation,
      totalTime: finalTime,
      formattedTime: formatTime(finalTime),
      pace: avgPace,
      formattedPace: formatPace(avgPace),
      segment: "Arrivo"
    });
  }

  return checkpoints;
}
