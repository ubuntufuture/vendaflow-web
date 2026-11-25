"use client";
import { useState } from "react";
export function ThemeSwitch({ initial }: { initial: "light" | "dark" }) {
  const [theme, setTheme] = useState(initial);
  return (
    <button
      type="button"
      className="vf-button vf-button-secondary"
      aria-label={`Ativar tema ${theme === "light" ? "escuro" : "claro"}`}
      onClick={() => {
        const next = theme === "light" ? "dark" : "light";
        document.documentElement.dataset.theme = next;
        document.cookie = `vf-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
        setTheme(next);
      }}
    >
      {theme === "light" ? "Tema escuro" : "Tema claro"}
    </button>
  );
}
