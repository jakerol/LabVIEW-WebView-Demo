import { useState, useEffect, useCallback } from "react";
import bridge from "./bridge";
import type { TagValue } from "./bridge";
// Hook to subscribe to a LabVIEW tag and send updates back to LabVIEW 
export function useLabVIEW<T extends TagValue>(tag: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (bridge.store.has(tag)) return bridge.store.get(tag) as T;
    return initialValue;
  });

  useEffect(() => {
    const unsubscribe = bridge.subscribe(tag, (newValue) => {
      setValue(newValue as T);
    });
    return unsubscribe;
  }, [tag]);

  const send = useCallback(
    (data: T) => {
      setValue(data);
      bridge.sendToLabVIEW(tag, data);
    },
    [tag]
  );

  return [value, send] as const;
}