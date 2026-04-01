"use client";

import React, { createContext, useCallback, useEffect, useState } from "react";

type FocusContextType = {
  isFocusMode: boolean;
  setIsFocusMode: (v: boolean) => void;
  toggleFocusMode: () => void;
};

export const FocusContext = createContext<FocusContextType>({
  isFocusMode: false,
  setIsFocusMode: () => {},
  toggleFocusMode: () => {},
});

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Força o modo claro e remove classes de margem via injeção de estilo se necessário
  const forceLightUi = useCallback(() => {
    try {
      const html = document.documentElement;
      html.classList.remove("dark");
      html.classList.add("light");
      html.style.colorScheme = "light";
      // Remove o background escuro que o Fullscreen do navegador costuma colocar
      html.style.backgroundColor = "#ffffff";
    } catch (e) {
      console.error(e);
    }
  }, []);

  const setFocus = useCallback(
    async (v: boolean) => {
      setIsFocusMode(v);
      forceLightUi();

      if (v) {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } catch (err) {
          console.warn("Erro ao entrar em fullscreen:", err);
        }
      } else {
        try {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          }
        } catch (err) {
          console.warn("Erro ao sair do fullscreen:", err);
        }
      }
    },
    [forceLightUi]
  );

  const toggleFocusMode = useCallback(() => setFocus(!isFocusMode), [setFocus, isFocusMode]);

  useEffect(() => {
    const handleSync = () => {
      if (!document.fullscreenElement) {
        setIsFocusMode(false);
      }
    };

    document.addEventListener("fullscreenchange", handleSync);
    return () => document.removeEventListener("fullscreenchange", handleSync);
  }, []);

  return (
    <FocusContext.Provider value={{ isFocusMode, setIsFocusMode: setFocus, toggleFocusMode }}>
      <div className={isFocusMode ? "light bg-white" : ""}>
        {children}
      </div>
    </FocusContext.Provider>
  );
}

export default FocusProvider;
