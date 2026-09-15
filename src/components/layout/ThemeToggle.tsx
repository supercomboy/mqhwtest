import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useThemeContext } from "@/components/layout/ThemeProvider";

const LABEL: Record<string, string> = {
  light: "Light mode",
  dark: "Dark mode",
  system: "System theme",
};

const ICON = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

export function ThemeToggle() {
  const { theme, cycleTheme } = useThemeContext();
  const Icon = ICON[theme];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      title={LABEL[theme]}
      aria-label={`Theme: ${LABEL[theme]}. Click to cycle.`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}