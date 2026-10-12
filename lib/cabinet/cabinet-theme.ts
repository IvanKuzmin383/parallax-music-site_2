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
  document.documentElement.setAttribute("data-cabinet-theme", mode)
  document.documentElement.classList.toggle("dark", mode === "dark")
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
export const CABINET_THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(CABINET_THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark")t="dark";document.documentElement.setAttribute("data-cabinet-theme",t);document.documentElement.classList.toggle("dark",t==="dark");}catch(e){document.documentElement.setAttribute("data-cabinet-theme","dark");document.documentElement.classList.add("dark");}})();`
