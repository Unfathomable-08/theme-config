import type { ThemeChangeCallback, UnsubscribeFn } from "./types";

export interface EventEmitter {
  emit(newTheme: string, previousTheme: string | null): void;
  subscribe(callback: ThemeChangeCallback): UnsubscribeFn;
  clear(): void;
}

export function createEventEmitter(): EventEmitter {
  const listeners = new Set<ThemeChangeCallback>();

  return {
    emit(newTheme, previousTheme) {
      listeners.forEach((cb) => cb(newTheme, previousTheme));
    },
    subscribe(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    clear() {
      listeners.clear();
    },
  };
}
