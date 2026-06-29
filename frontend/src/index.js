import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "next-themes";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    {/*
      Theme wiring (Requirement 3.5, updated): when NO theme selection is
      stored, the app MUST default to LIGHT regardless of the OS color-scheme
      preference. So we use defaultTheme="light" with enableSystem={false}
      rather than "system" — the user can still explicitly toggle light/dark
      (Requirement 3.1 — exactly two states). This mirrors the deterministic
      rules in src/lib/design/resolveTheme.js (initialTheme returns the stored
      preference or "light"). disableTransitionOnChange avoids flashes on swap.
    */}
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
