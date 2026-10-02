# theme-config

CSS-variable theme engine for any framework. Light, dark, and unlimited custom themes.

Created by [Muhammad](https://dev-muhammad.vercel.app/)

Most theme libraries give you a dark mode toggle. `theme-config` gives you a full theme engine — unlimited named themes, automatic persistence, OS preference detection, cross-tab sync, smooth transitions, and a clean runtime API. So you can stop re-inventing this wheel.

---

## Installation

```bash
npm install theme-config
# or
yarn add theme-config
# or
pnpm add theme-config
```

**Requirements:** Any modern browser. Zero runtime dependencies.

---

## Features

- **Unlimited themes** — `light`, `dark`, `red`, `blue`, or anything you define
- **CSS variables** — themes are maps of custom properties applied directly to `<html>`
- **Persistence** — survives page refreshes via `localStorage` or `sessionStorage`
- **System preference** — respects `prefers-color-scheme` and watches for OS changes live
- **Cross-tab sync** — theme changes instantly reflect in every open tab
- **Dynamic themes** — add or remove themes at runtime with `.add()` and `.remove()`
- **Transitions** — smooth CSS transitions between theme switches
- **Event system** — subscribe to theme changes with `.onChange()`
- **Zero dependencies** — no runtime deps, ~4 kB gzipped

---

## Quick start

```ts
import { createTheme } from "theme-config";

const theme = createTheme({
  themes: {
    light: {
      "--primary": "#000000",
      "--background": "#ffffff",
      "--foreground": "#111111",
      "--border": "#e5e5e5",
    },
    dark: {
      "--primary": "#ffffff",
      "--background": "#111111",
      "--foreground": "#ffffff",
      "--border": "#333333",
    },
  },
  defaultTheme: "light",
  persist: true,
});

// Switch theme
theme.set("dark");

// Toggle light ↔ dark
theme.toggle();
```

Your CSS just uses the variables — no extra work:

```css
body {
  background: var(--background);
  color: var(--foreground);
}

button {
  background: var(--primary);
  border: 1px solid var(--border);
}
```

---

## How it works

When you call `createTheme()`:

1. All theme definitions are stored in an internal registry
2. The last saved theme is read from storage (or `defaultTheme` is used)
3. That theme's CSS variables are applied directly to `<html>` via `element.style.setProperty()`
4. The active theme name is set as `<html data-theme="dark">` (or a class, your choice)

Every call to `.set()`, `.toggle()`, `.next()` or `.previous()` runs through the same pipeline:

```
applyTheme(name)
  │
  ├── resolve "system" → "light" or "dark" via matchMedia
  ├── look up variables in registry
  ├── remove old CSS vars from <html>
  ├── apply new CSS vars to <html>
  ├── update data-theme attribute
  ├── save to localStorage
  ├── broadcast to other tabs (if sync: true)
  └── fire onChange callbacks
```

---

## API

### `createTheme(config)`

Creates and initializes a theme instance. Returns a `ThemeInstance`.

```ts
const theme = createTheme(config: ThemeConfig): ThemeInstance
```

---

### Config options

#### `themes` — required

A record of theme names to theme definitions.

```ts
themes: {
  light: { "--primary": "#000", "--background": "#fff" },
  dark:  { "--primary": "#fff", "--background": "#111" },
}
```

Optionally include display metadata for building theme pickers:

```ts
themes: {
  red: {
    label: "Ruby",       // human-readable name
    color: "#ef4444",    // swatch color
    variables: {
      "--primary": "#ef4444",
      "--background": "#fffafa",
    },
  },
}
```

---

#### `defaultTheme`

Theme applied on first load when nothing is saved in storage.

```ts
defaultTheme: "light"   // defaults to first key in themes
```

---

#### `persist`

Remember the active theme across page loads.

```ts
persist: true   // default: true
```

---

#### `storage`

Where to persist the theme.

```ts
storage: "localStorage"    // default
storage: "sessionStorage"  // tab only
storage: "none"            // no persistence
```

---

#### `storageKey`

Key used in storage.

```ts
storageKey: "my-app-theme"   // default: "theme-config"
```

---

#### `attribute`

How the active theme name is applied to the DOM element.

```ts
attribute: "data-theme"   // default → <html data-theme="dark">
attribute: "class"        // → <html class="theme-dark">
```

---

#### `classPrefix`

Prefix used when `attribute: "class"`.

```ts
classPrefix: "theme-"   // default → "theme-dark"
classPrefix: "app-"     // → "app-dark"
```

---

#### `target`

DOM element to apply variables and the attribute to.

```ts
target: document.documentElement      // default (<html>)
target: document.getElementById("app")!
```

---

#### `transition`

Smoothly animate between theme switches.

```ts
transition: true            // default: false
transitionDuration: 300     // ms, default: 200
```

---

#### `sync`

Synchronize the active theme across all open browser tabs.

```ts
sync: true   // default: false
```

---

### Instance methods

#### `.set(name, options?)`

Switch to a named theme. Pass `"system"` to follow OS preference.

```ts
theme.set("dark")
theme.set("red")
theme.set("system")                    // follows prefers-color-scheme
theme.set("dark", { transition: true }) // per-call transition override
```

---

#### `.toggle()`

Toggle between `light` and `dark`.

```ts
theme.toggle()
// light → dark → light → ...
```

---

#### `.next()`

Advance to the next theme in registration order. Wraps around.

```ts
theme.next()
// light → dark → red → blue → light → ...
```

---

#### `.previous()`

Go to the previous theme. Wraps around.

```ts
theme.previous()
```

---

#### `.current()`

Returns the currently active theme name.

```ts
theme.current()   // "dark" | "red" | "system" | ...
```

---

#### `.getThemes()`

Returns all registered theme names in order.

```ts
theme.getThemes()
// ["light", "dark", "red", "blue"]
```

---

#### `.getThemeMeta()`

Returns full metadata for all themes. Useful for building theme pickers.

```ts
theme.getThemeMeta()
// [
//   { name: "light", variables: { "--primary": "..." } },
//   { name: "red", label: "Ruby", color: "#ef4444", variables: { ... } },
// ]
```

---

#### `.has(name)`

Returns `true` if the theme is registered.

```ts
theme.has("red")      // true
theme.has("purple")   // false
```

---

#### `.add(name, definition)`

Register a new theme at runtime.

```ts
theme.add("purple", {
  "--primary": "#a855f7",
  "--background": "#faf5ff",
  "--foreground": "#1a0a2e",
  "--border": "#e9d5ff",
})

theme.set("purple")
```

---

#### `.remove(name)`

Remove a registered theme. If it was active, falls back to `defaultTheme`.

```ts
theme.remove("purple")
```

---

#### `.onChange(callback)`

Subscribe to theme changes. Returns an unsubscribe function.

```ts
const unsubscribe = theme.onChange((newTheme, previousTheme) => {
  console.log(`${previousTheme} → ${newTheme}`)
})

// Stop listening:
unsubscribe()
```

---

#### `.destroy()`

Tear down all listeners, BroadcastChannel, and callbacks. Call when unmounting.

```ts
theme.destroy()
```

---

## Recipes

### Auto-generate a theme picker

```ts
const meta = theme.getThemeMeta();

meta.forEach(({ name, label, color }) => {
  const btn = document.createElement("button");
  btn.textContent = label ?? name;
  if (color) btn.style.setProperty("--swatch", color);
  btn.onclick = () => theme.set(name);
  picker.appendChild(btn);
});
```

---

### System preference with manual override

```ts
const theme = createTheme({
  themes: { light: {...}, dark: {...} },
  defaultTheme: "system",
});

theme.set("dark");     // user overrides OS setting
theme.set("system");   // back to following OS
```

---

### React integration

```ts
import { createTheme } from "theme-config";
import { useState, useEffect } from "react";

const theme = createTheme({ themes: { light: {...}, dark: {...} } });

export function useTheme() {
  const [current, setCurrent] = useState(theme.current());

  useEffect(() => {
    return theme.onChange((newTheme) => setCurrent(newTheme));
  }, []);

  return {
    theme: current,
    setTheme: (name) => theme.set(name),
    toggleTheme: () => theme.toggle(),
    themes: theme.getThemes(),
  };
}
```

---

### Preventing flash on page load

Add this **inline script** in your `<head>` before any other scripts or styles:

```html
<script>
  (function () {
    try {
      var key = "theme-config";
      var saved = localStorage.getItem(key);
      var system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", saved || system);
    } catch (e) {}
  })();
</script>
```

This synchronously applies the theme attribute before the browser renders anything, eliminating the white flash between page load and JS execution.

---

### Multi-tenant / per-user themes

```ts
const theme = createTheme({
  themes: {
    "brand-a": { "--primary": "#e63946", "--background": "#f1faee" },
    "brand-b": { "--primary": "#2196f3", "--background": "#e3f2fd" },
  },
  storageKey: `theme-${userId}`,
  persist: true,
});
```

---

## TypeScript

Fully typed. All types are exported:

```ts
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
  StorageType,
  AttributeMode,
} from "theme-config";
```

---

## Architecture

```
theme-config
│
├── src/
│   ├── index.ts              Public re-exports
│   └── core/
│       ├── types.ts          All TypeScript types and interfaces
│       ├── createTheme.ts    Main factory — wires everything together
│       ├── storage.ts        localStorage / sessionStorage wrapper
│       ├── events.ts         Typed event emitter (Set-based)
│       └── system.ts         prefers-color-scheme wrapper
│
└── dist/
    ├── theme-config.js       ESM output
    ├── theme-config.cjs      CommonJS output
    └── index.d.ts            Bundled type declarations
```

---

## License

MIT © [Muhammad](https://dev-muhammad.vercel.app/)

---

## Contributing

Issues and PRs welcome at [github.com/unfathomable-08/theme-config](https://github.com/unfathomable-08/theme-config).
