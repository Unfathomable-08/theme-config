import type {
  ThemeConfig,
  ThemeInstance,
  ThemeDefinition,
  ThemeVariables,
  ThemeMeta,
  NormalizedTheme,
  SetOptions,
  ThemeChangeCallback,
  UnsubscribeFn,
} from "./types";
import { createStorage } from "./storage";
import { createEventEmitter } from "./events";
import { createSystemPreference } from "./system";

function isWithMeta(def: ThemeDefinition): def is ThemeMeta & { variables: ThemeVariables } {
  return typeof def === "object" && def !== null && "variables" in def && typeof (def as Record<string, unknown>)["variables"] === "object";
}

function normalize(name: string, def: ThemeDefinition): NormalizedTheme {
  if (isWithMeta(def)) {
    return {
      name,
      label: def.label,
      color: def.color,
      variables: def.variables,
    };
  }
  return { name, variables: def as ThemeVariables };
}

function applyVariables(target: HTMLElement, variables: Record<string, string>) {
  for (const [prop, value] of Object.entries(variables)) {
    target.style.setProperty(prop, value);
  }
}

function removeVariables(target: HTMLElement, variables: Record<string, string>) {
  for (const prop of Object.keys(variables)) {
    target.style.removeProperty(prop);
  }
}

function applyAttribute(
  target: HTMLElement,
  attribute: "data-theme" | "class",
  classPrefix: string,
  themeName: string,
  previousName: string | null
) {
  if (attribute === "class") {
    if (previousName) {
      target.classList.remove(`${classPrefix}${previousName}`);
    }
    target.classList.add(`${classPrefix}${themeName}`);
  } else {
    target.setAttribute("data-theme", themeName);
  }
}

const SYSTEM_KEY = "system";

export function createTheme(config: ThemeConfig): ThemeInstance {
  const {
    themes: rawThemes,
    defaultTheme,
    persist = true,
    storage: storageType = "localStorage",
    storageKey = "theme-config",
    attribute = "data-theme",
    classPrefix = "theme-",
    transition = false,
    transitionDuration = 200,
    sync = false,
  } = config;

  const registry = new Map<string, NormalizedTheme>();
  for (const [name, def] of Object.entries(rawThemes)) {
    registry.set(name, normalize(name, def));
  }

  const themeNames = () => Array.from(registry.keys());
  const fallback = defaultTheme ?? themeNames()[0];

  let currentTheme: string | null = null;

  const storage = createStorage(persist ? storageType : "none", storageKey);
  const emitter = createEventEmitter();
  const system = createSystemPreference();

  // Lazily resolved DOM target (supports SSR where document may not exist yet)
  const getTarget = () =>
    config.target ?? (typeof document !== "undefined" ? document.documentElement : null);

  let broadcastChannel: BroadcastChannel | null = null;
  if (sync && typeof BroadcastChannel !== "undefined") {
    broadcastChannel = new BroadcastChannel(storageKey);
    broadcastChannel.onmessage = (e: MessageEvent<string>) => {
      if (e.data && e.data !== currentTheme) {
        applyTheme(e.data, { _skipBroadcast: true });
      }
    };
  }

  let stopSystemWatch: (() => void) | null = null;

  function applyTheme(name: string, opts: SetOptions & { _skipBroadcast?: boolean } = {}) {
    const target = getTarget();
    const previous = currentTheme;

    // Resolve "system" -> light or dark
    const resolved = name === SYSTEM_KEY ? system.get() : name;

    if (!registry.has(resolved)) {
      console.warn(`[theme-config] Unknown theme "${resolved}". Falling back to "${fallback}".`);
      return applyTheme(fallback);
    }

    const theme = registry.get(resolved)!;

    // Transition: temporarily add a CSS transition to * on the target
    const useTransition = opts.transition !== undefined ? opts.transition : transition;
    if (useTransition && target) {
      target.style.setProperty(
        "transition",
        `color ${transitionDuration}ms, background-color ${transitionDuration}ms`
      );
      setTimeout(() => target.style.removeProperty("transition"), transitionDuration);
    }

    // Remove old variables
    if (previous && previous !== SYSTEM_KEY) {
      const prev = registry.get(previous === SYSTEM_KEY ? system.get() : previous);
      if (prev && target) removeVariables(target, prev.variables);
    }

    // Apply new variables
    if (target) {
      applyVariables(target, theme.variables);
      applyAttribute(target, attribute, classPrefix, resolved, previous);
    }

    currentTheme = name; // store the logical name ("system" if set that way)
    if (persist) storage.set(name);

    // Broadcast to other tabs
    if (sync && broadcastChannel && !opts._skipBroadcast) {
      broadcastChannel.postMessage(name);
    }

    // System watcher: start/stop depending on mode
    if (name === SYSTEM_KEY) {
      if (!stopSystemWatch) {
        stopSystemWatch = system.watch(() => {
          // OS changed — re-resolve
          const resolvedNow = system.get();
          if (registry.has(resolvedNow) && target) {
            const t = registry.get(resolvedNow)!;
            removeVariables(target, theme.variables);
            applyVariables(target, t.variables);
            applyAttribute(target, attribute, classPrefix, resolvedNow, resolved);
          }
        });
      }
    } else {
      stopSystemWatch?.();
      stopSystemWatch = null;
    }

    emitter.emit(name, previous);
  }

  const persisted = persist ? storage.get() : null;
  applyTheme(persisted ?? fallback);

  return {
    set(name, options = {}) {
      applyTheme(name, options);
    },

    toggle() {
      const names = themeNames();
      const light = names.find((n) => n === "light") ?? names[0];
      const dark = names.find((n) => n === "dark") ?? names[1] ?? names[0];
      const logical = currentTheme === SYSTEM_KEY ? system.get() : (currentTheme ?? fallback);
      applyTheme(logical === light ? dark : light);
    },

    next() {
      const names = themeNames();
      const logical = currentTheme === SYSTEM_KEY ? system.get() : (currentTheme ?? fallback);
      const idx = names.indexOf(logical);
      applyTheme(names[(idx + 1) % names.length]);
    },

    previous() {
      const names = themeNames();
      const logical = currentTheme === SYSTEM_KEY ? system.get() : (currentTheme ?? fallback);
      const idx = names.indexOf(logical);
      applyTheme(names[(idx - 1 + names.length) % names.length]);
    },

    current() {
      return currentTheme ?? fallback;
    },

    getThemes() {
      return themeNames();
    },

    getThemeMeta() {
      return Array.from(registry.values());
    },

    has(name) {
      return registry.has(name);
    },

    add(name, definition) {
      registry.set(name, normalize(name, definition));
    },

    remove(name) {
      if (!registry.has(name)) return;
      registry.delete(name);
      // If the removed theme is active, fall back
      const logical = currentTheme === SYSTEM_KEY ? system.get() : currentTheme;
      if (logical === name) {
        applyTheme(fallback);
      }
    },

    onChange(callback: ThemeChangeCallback): UnsubscribeFn {
      return emitter.subscribe(callback);
    },

    destroy() {
      stopSystemWatch?.();
      broadcastChannel?.close();
      emitter.clear();
    },
  };
}
