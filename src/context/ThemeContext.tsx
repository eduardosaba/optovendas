"use client";

import React, { createContext, useCallback, useLayoutEffect } from "react";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const forceLightTheme = useCallback(() => {
    try {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("opv_theme", "light");
    } catch {
      // ignore
    }
  }, []);

  const setTheme = useCallback((_t: Theme) => {
    // Temporariamente bloqueado em modo claro.
    forceLightTheme();
  }, [forceLightTheme]);

  const toggleTheme = useCallback(() => {
    // Temporariamente bloqueado em modo claro.
    forceLightTheme();
  }, [forceLightTheme]);

  useLayoutEffect(() => {
    forceLightTheme();
  }, [forceLightTheme]);

  return <ThemeContext.Provider value={{ theme: "light", setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
