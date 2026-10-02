export type SystemScheme = "light" | "dark";

export interface SystemPreference {
  /** Current OS color scheme */
  get(): SystemScheme;
  /** Watch for OS changes — returns a cleanup function */
  watch(callback: (scheme: SystemScheme) => void): () => void;
  /** True if the browser supports prefers-color-scheme */
  isSupported(): boolean;
}

export function createSystemPreference(): SystemPreference {
  const query =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

  return {
    isSupported() {
      return query !== null;
    },

    get() {
      return query?.matches ? "dark" : "light";
    },

    watch(callback) {
      if (!query) return () => {};

      const handler = (e: MediaQueryListEvent) => {
        callback(e.matches ? "dark" : "light");
      };

      // Use addEventListener when available (modern), fall back to addListener
      if (query.addEventListener) {
        query.addEventListener("change", handler);
        return () => query.removeEventListener("change", handler);
      } else {
        // Safari < 14 fallback
        query.addListener(handler);
        return () => query.removeListener(handler);
      }
    },
  };
}
