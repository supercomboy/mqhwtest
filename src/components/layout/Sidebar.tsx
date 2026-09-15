import { NavLink } from "react-router-dom";
import { Home } from "lucide-react";

import { DEVICES } from "@/data/devices";
import { cn } from "@/lib/utils";

interface SidebarProps {
  /** Callback đóng drawer trên mobile. Không truyền trên desktop. */
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="flex h-full w-full flex-col gap-1 p-3"
    >
      <SidebarLink to="/" end onNavigate={onNavigate}>
        <Home className="h-4 w-4" aria-hidden="true" />
        <span>Dashboard</span>
      </SidebarLink>

      <div className="my-2 px-3">
        <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Device Tests
        </p>
      </div>

      {DEVICES.map((device) => {
        const Icon = device.icon;
        return (
          <SidebarLink
            key={device.id}
            to={device.path}
            onNavigate={onNavigate}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{device.title}</span>
          </SidebarLink>
        );
      })}
    </nav>
  );
}

interface SidebarLinkProps {
  to: string;
  end?: boolean;
  onNavigate?: () => void;
  children: React.ReactNode;
}

function SidebarLink({ to, end, onNavigate, children }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        )
      }
    >
      {children}
    </NavLink>
  );
}