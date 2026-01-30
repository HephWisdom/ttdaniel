import { useEffect, useState } from "react";

function getInitialTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") return saved;

  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

  return prefersDark ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm
                 hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <span className="h-2 w-2 rounded-full bg-zinc-950 dark:bg-zinc-50" />
      <span className="text-black/70 dark:text-white/70">
        {theme === "dark" ? "Dark" : "Light"}
      </span>
    </button>
  );
}
