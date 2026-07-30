import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  // Storage access throws SecurityError when site data is blocked (Safari with
  // cookies disabled, hardened browser profiles). An unguarded throw inside
  // useEffect unmounts the tree and the user gets a blank page — losing the
  // theme preference is the acceptable failure, a blank app is not.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("theme");
    } catch {
      stored = null;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = stored ? stored === "dark" : prefersDark;
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
    document.documentElement.classList.toggle("light", !shouldBeDark);
  }, []);

  const toggle = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    try {
      localStorage.setItem("theme", newIsDark ? "dark" : "light");
    } catch {
      // Preference won't persist across reloads. The toggle still works.
    }
    document.documentElement.classList.toggle("dark", newIsDark);
    document.documentElement.classList.toggle("light", !newIsDark);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className={cn(
        "h-8 w-8 p-0 rounded-full",
        "bg-muted/50 hover:bg-muted",
        "transition-all duration-200"
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-warning" />
      ) : (
        <Moon className="h-4 w-4 text-primary" />
      )}
    </Button>
  );
}
