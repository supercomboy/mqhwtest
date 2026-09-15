import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { DeviceId, DeviceStatus } from "@/types/device";

interface DeviceStatusEntry {
  status: DeviceStatus;
  message?: string;
}

interface DeviceStatusStats {
  total: number;
  passed: number;
  warning: number;
  error: number;
  untouched: number;
}

interface DeviceStatusContextValue {
  getEntry: (id: DeviceId) => DeviceStatusEntry;
  setStatus: (id: DeviceId, status: DeviceStatus, message?: string) => void;
  reset: (id: DeviceId) => void;
  resetAll: () => void;
  stats: DeviceStatusStats;
}

const DEFAULT_ENTRY: DeviceStatusEntry = { status: "ready" };

const INITIAL_IDS: DeviceId[] = [
  "keyboard",
  "speaker",
  "microphone",
  "camera",
  "display",
];

const DeviceStatusContext = createContext<DeviceStatusContextValue | null>(
  null,
);

export function DeviceStatusProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<DeviceId, DeviceStatusEntry>>(
    () =>
      INITIAL_IDS.reduce(
        (acc, id) => {
          acc[id] = { ...DEFAULT_ENTRY };
          return acc;
        },
        {} as Record<DeviceId, DeviceStatusEntry>,
      ),
  );

  const getEntry = useCallback(
    (id: DeviceId): DeviceStatusEntry => entries[id] ?? DEFAULT_ENTRY,
    [entries],
  );

  const setStatus = useCallback(
    (id: DeviceId, status: DeviceStatus, message?: string) => {
      setEntries((prev) => ({
        ...prev,
        [id]: { status, message },
      }));
    },
    [],
  );

  const reset = useCallback((id: DeviceId) => {
    setEntries((prev) => ({
      ...prev,
      [id]: { ...DEFAULT_ENTRY },
    }));
  }, []);

  const resetAll = useCallback(() => {
    setEntries(() =>
      INITIAL_IDS.reduce(
        (acc, id) => {
          acc[id] = { ...DEFAULT_ENTRY };
          return acc;
        },
        {} as Record<DeviceId, DeviceStatusEntry>,
      ),
    );
  }, []);

  const stats = useMemo<DeviceStatusStats>(() => {
    let passed = 0;
    let warning = 0;
    let error = 0;
    let untouched = 0;
    for (const id of INITIAL_IDS) {
      const s = entries[id]?.status ?? "ready";
      if (s === "passed") passed++;
      else if (s === "warning") warning++;
      else if (s === "error") error++;
      else if (s === "ready") untouched++;
    }
    return { total: INITIAL_IDS.length, passed, warning, error, untouched };
  }, [entries]);

  const value = useMemo<DeviceStatusContextValue>(
    () => ({ getEntry, setStatus, reset, resetAll, stats }),
    [getEntry, setStatus, reset, resetAll, stats],
  );

  return (
    <DeviceStatusContext.Provider value={value}>
      {children}
    </DeviceStatusContext.Provider>
  );
}

export function useDeviceStatus(): DeviceStatusContextValue {
  const ctx = useContext(DeviceStatusContext);
  if (!ctx) {
    throw new Error("useDeviceStatus must be used inside <DeviceStatusProvider>");
  }
  return ctx;
}