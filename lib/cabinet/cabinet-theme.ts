export const CABINET_THEME_STORAGE_KEY = "parallax-cabinet-theme"
export type CabinetThemeMode = "dark" | "light"

export function isCabinetThemeMode(value: unknown): value is CabinetThemeMode {
  return value === "dark" || value === "light"
}

export function readCabinetTheme(): CabinetThemeMode {
  if (typeof window === "undefined") return "dark"
  try {
    const raw = window.localStorage.getItem(CABINET_THEME_STORAGE_KEY)
    return isCabinetThemeMode(raw) ? raw : "dark"
  } catch {
    return "dark"
  }
}

export function applyCabinetTheme(mode: CabinetThemeMode) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.classList.add("cabinet-theme")
  root.setAttribute("data-cabinet-theme", mode)
  root.classList.toggle("dark", mode === "dark")
}

export function persistCabinetTheme(mode: CabinetThemeMode) {
  try {
    window.localStorage.setItem(CABINET_THEME_STORAGE_KEY, mode)
  } catch {
    // ignore quota / private mode
  }
  applyCabinetTheme(mode)
}

/** Inline script: без мигания до гидрации. */
export const CABINET_THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(CABINET_THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark")t="dark";var r=document.documentElement;r.classList.add("cabinet-theme");r.setAttribute("data-cabinet-theme",t);r.classList.toggle("dark",t==="dark");}catch(e){var r2=document.documentElement;r2.classList.add("cabinet-theme");r2.setAttribute("data-cabinet-theme","dark");r2.classList.add("dark");}})();`
