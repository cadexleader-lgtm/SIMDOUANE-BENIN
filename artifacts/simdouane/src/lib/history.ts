import { FormInput, SimulationResult } from "./calculator";
import { Powertrain, VehicleCondition } from "./regulatory-config-2026";

export interface HistoryEntry {
  id: string;
  date: string;
  input: FormInput;
  result: SimulationResult;
  condition?: VehicleCondition;
  powertrain?: Powertrain;
  referenceDate?: string;
  regulatoryYear?: number;
  calculatorVersion?: string;
  regulatoryConfigVersion?: string;
}

export function getHistory(): HistoryEntry[] {
  try {
    const data = localStorage.getItem("simdouane_history");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addHistory(entry: Omit<HistoryEntry, "id" | "date">): HistoryEntry {
  const history = getHistory();
  const newEntry: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  };
  const newHistory = [newEntry, ...history].slice(0, 50);
  localStorage.setItem("simdouane_history", JSON.stringify(newHistory));
  return newEntry;
}

export function clearHistory() {
  localStorage.removeItem("simdouane_history");
}

export function getCurrentSimulation(): HistoryEntry | null {
  try {
    const data = localStorage.getItem("simdouane_current");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setCurrentSimulation(entry: HistoryEntry) {
  localStorage.setItem("simdouane_current", JSON.stringify(entry));
}
