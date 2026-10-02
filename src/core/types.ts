/**
 * A map of CSS custom property names to their values.
 * Keys should start with "--".
 *
 * @example
 * { "--primary": "#3b82f6", "--background": "#ffffff" }
 */
export type ThemeVariables = Record<string, string>;

/**
 * Metadata that can optionally accompany a theme definition.
 * Useful for building theme pickers/selectors.
 */
export interface ThemeMeta {
  /** Human-readable display name. e.g. "Ruby" for a "red" theme */
  label?: string;
  /** A representative color for the theme — for swatches in a UI */
  color?: string;
}

/**
 * A single theme definition.
 * Can be a flat map of CSS variables, or include optional metadata.
 *
 * @example
 * // Simple
 * { "--primary": "#ef4444", "--background": "#fff" }
 *
 * @example
 * // With metadata
 * { label: "Ruby", color: "#ef4444", variables: { "--primary": "#ef4444" } }
 */
export type ThemeDefinition =
  | ThemeVariables
  | (ThemeMeta & { variables: ThemeVariables });

/** Internal representation — always normalized from ThemeDefinition */
export interface NormalizedTheme {
  name: string;
  label?: string;
  color?: string;
  variables: ThemeVariables;
}

export type StorageType = "localStorage" | "sessionStorage" | "none";

export interface PersistenceOptions {
  /**
   * Whether to persist the active theme across page loads.
   * @default true
   */
  persist?: boolean;

  /**
   * Storage mechanism to use for persistence.
   * @default "localStorage"
   */
  storage?: StorageType;

  /**
   * Key used when writing to storage.
   * @default "theme-config"
   */
  storageKey?: string;
}

export type AttributeMode = "data-theme" | "class";

export interface DOMOptions {
  /**
   * The DOM element to apply the theme attribute to.
   * @default document.documentElement (i.e. <html>)
   */
  target?: HTMLElement;

  /**
   * How the active theme name is applied to the DOM.
   *
   * - "data-theme" → <html data-theme="red">
   * - "class"      → <html class="theme-red">
   *
   * @default "data-theme"
   */
  attribute?: AttributeMode;

  /**
   * Prefix used when attribute is "class".
   * @default "theme-"
   */
  classPrefix?: string;
}

export interface TransitionOptions {
  /**
   * Animate CSS variable changes between theme switches.
   * @default false
   */
  transition?: boolean;

  /**
   * Duration of the CSS transition in milliseconds.
   * @default 200
   */
  transitionDuration?: number;
}

export interface SetOptions {
  /** Override the global transition setting for this specific call */
  transition?: boolean;
}

export interface ThemeConfig extends PersistenceOptions, DOMOptions, TransitionOptions {
  /**
   * All available themes keyed by name.
   *
   * @example
   * themes: {
   *   light: { "--primary": "#000" },
   *   dark:  { "--primary": "#fff" },
   * }
   */
  themes: Record<string, ThemeDefinition>;

  /**
   * The theme applied on first load (if nothing is persisted).
   * @default first key in themes
   */
  defaultTheme?: string;

  /**
   * Enable cross-tab synchronization via BroadcastChannel / storage events.
   * @default false
   */
  sync?: boolean;
}

export type ThemeChangeCallback = (
  newTheme: string,
  previousTheme: string | null
) => void;

export type UnsubscribeFn = () => void;

export interface ThemeInstance {
  /**
   * Switch to a named theme.
   * Pass "system" to follow OS preference (resolves to light/dark).
   */
  set(name: string, options?: SetOptions): void;

  /**
   * Toggle between light <-> dark.
   */
  toggle(): void;

  /**
   * Advance to the next theme in the list. Wraps around.
   */
  next(): void;

  /**
   * Go to the previous theme in the list. Wraps around.
   */
  previous(): void;

  /**
   * Returns the currently active theme name.
   * Returns "system" if system mode is active.
   */
  current(): string;

  /**
   * Returns all registered theme names in order.
   */
  getThemes(): string[];

  /**
   * Returns metadata for all registered themes.
   * Useful for rendering theme pickers.
   */
  getThemeMeta(): NormalizedTheme[];

  /**
   * Returns true if the given theme name is registered.
   */
  has(name: string): boolean;

  /**
   * Register a new theme at runtime.
   */
  add(name: string, definition: ThemeDefinition): void;

  /**
   * Remove a registered theme.
   * If the removed theme is active, falls back to defaultTheme.
   */
  remove(name: string): void;

  /**
   * Subscribe to theme changes.
   * Returns an unsubscribe function.
   */
  onChange(callback: ThemeChangeCallback): UnsubscribeFn;

  /**
   * Tear down listeners, BroadcastChannel, etc.
   * Call when unmounting (e.g. in SPA route cleanup).
   */
  destroy(): void;
}
