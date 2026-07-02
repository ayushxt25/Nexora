import { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "theme_preference";
const THEME_OPTIONS = [
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const ThemeContext = createContext(null);

function applyTheme(preference) {
  const root = document.documentElement;
  root.dataset.theme = preference;
  root.style.colorScheme = preference === "system" ? "dark light" : "dark";
}

export function ThemeProvider({ children }) {
  const [themePreference, setThemePreference] = useState(() => {
    if (typeof window === "undefined") return "system";
    return localStorage.getItem(THEME_STORAGE_KEY) || "system";
  });

  useEffect(() => {
    applyTheme(themePreference);
    localStorage.setItem(THEME_STORAGE_KEY, themePreference);
  }, [themePreference]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (themePreference === "system") {
        applyTheme("system");
      }
    };
    handleChange();
    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, [themePreference]);

  const value = useMemo(
    () => ({
      themePreference,
      setThemePreference,
      themeOptions: THEME_OPTIONS,
    }),
    [themePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
