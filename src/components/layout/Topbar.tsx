import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const base = import.meta.env.BASE_URL;

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      {/* Left: mobile menu */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      {/* Center: theme-aware logo + title */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3">
        {/* Light mode logo */}
        <img
          src={`${base}logo.png`}
          alt="MQ Device Tester logo"
          width={48}
          height={48}
          className="h-12 w-12 object-contain dark:hidden"
        />
        {/* Dark mode logo */}
        <img
          src={`${base}logo1.png`}
          alt=""
          aria-hidden="true"
          width={48}
          height={48}
          className="hidden h-12 w-12 object-contain dark:block"
        />
        <span className="hidden text-base font-semibold tracking-tight sm:inline">
          MQ Device Tester
        </span>
      </div>

      {/* Right: theme toggle */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  );
}