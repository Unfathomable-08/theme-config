import type { StorageType } from "./types";

export interface ThemeStorage {
  get(): string | null;
  set(value: string): void;
  clear(): void;
}

function memoryFallback(): ThemeStorage {
  let value: string | null = null;
  return {
    get: () => value,
    set: (v) => { value = v; },
    clear: () => { value = null; },
  };
}

export function createStorage(type: StorageType, key: string): ThemeStorage {
  if (type === "none") {
    return memoryFallback();
  }

  // In SSR / non-browser envs, storage APIs don't exist
  const store = typeof window !== "undefined" ? window[type] : null;

  if (!store) {
    return memoryFallback();
  }

  return {
    get: () => {
      try {
        return store.getItem(key);
      } catch {
        return null;
      }
    },
    set: (value) => {
      try {
        store.setItem(key, value);
      } catch {
        // Quota exceeded or private browsing — silently ignore
      }
    },
    clear: () => {
      try {
        store.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}
