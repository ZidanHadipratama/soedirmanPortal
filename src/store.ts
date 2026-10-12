import { useEffect, useState } from "react";
import { createSeed, type Store } from "./model";
import { migrateStore } from "./persistence";
export const STORAGE_KEY = "soedirman.portal.v2";
export const LEGACY_STORAGE_KEY = "soedirman.portal.v1";
export function readStore(): Store {
  for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return migrateStore(JSON.parse(raw));
    } catch {
      /* Leave the old key untouched and try the compatible backup. */
    }
  }
  return createSeed();
}
export function useStore() {
  const [data, setData] = useState<Store>(readStore);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [data]);
  return { data, setData, storageError };
}
