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

export function FocusProvider({ children, focusRef }: { children: React.ReactNode; focusRef?: React.RefObject<HTMLElement | null> }) {
  const [isFocusMode, setIsFocusMode] = useState(false);

  const enterFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) return;
      const target = (focusRef?.current ?? document.documentElement) as Element;
      await (target as any).requestFullscreen?.();
    } catch {
      // ignore
    }
  }, [focusRef]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) return;
      await document.exitFullscreen?.();
    } catch {
      // ignore
    }
  }, []);

  const setFocus = useCallback(
    (v: boolean) => {
      setIsFocusMode(v);
      if (v) void enterFullscreen();
      else void exitFullscreen();
    },
    [enterFullscreen, exitFullscreen]
  );

  const toggleFocusMode = useCallback(() => setFocus(!isFocusMode), [setFocus, isFocusMode]);

  useEffect(() => {
    function onFullscreenChange() {
      // if user exited fullscreen (ESC), sync state
      const active = !!document.fullscreenElement;
      if (!active) setIsFocusMode(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsFocusMode(false);
      }
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <FocusContext.Provider value={{ isFocusMode, setIsFocusMode: setFocus, toggleFocusMode }}>
      {children}
    </FocusContext.Provider>
  );
}

export default FocusProvider;
