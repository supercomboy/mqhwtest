import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
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
        <div className="flex items-center gap-2">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="MQ Device Tester logo"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
          <span className="hidden font-semibold tracking-tight sm:inline">
            MQ Device Tester
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  );
}