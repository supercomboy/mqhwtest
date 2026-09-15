import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  MinusCircle,
  ShieldAlert,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@/types/device";

interface StatusConfig {
  icon: LucideIcon;
  label: string;
  className: string;
  spin?: boolean;
}

const CONFIG: Record<DeviceStatus, StatusConfig> = {
  ready: {
    icon: Circle,
    label: "READY",
    className: "bg-muted text-muted-foreground border-border",
  },
  testing: {
    icon: Loader2,
    label: "TESTING",
    className: "bg-info/10 text-info border-info/30",
    spin: true,
  },
  passed: {
    icon: CheckCircle2,
    label: "PASSED",
    className: "bg-success/10 text-success border-success/30",
  },
  warning: {
    icon: AlertTriangle,
    label: "WARNING",
    className: "bg-warning/10 text-warning border-warning/30",
  },
  error: {
    icon: XCircle,
    label: "ERROR",
    className: "bg-error/10 text-error border-error/30",
  },
  "permission-required": {
    icon: ShieldAlert,
    label: "PERMISSION REQUIRED",
    className: "bg-warning/10 text-warning border-warning/30",
  },
  "not-available": {
    icon: MinusCircle,
    label: "NOT AVAILABLE",
    className: "bg-muted text-muted-foreground border-border",
  },
};

interface StatusBadgeProps {
  status: DeviceStatus;
  className?: string;
  /** Nếu true, chỉ hiển thị icon — dùng cho không gian chật */
  iconOnly?: boolean;
}

export function StatusBadge({
  status,
  className,
  iconOnly = false,
}: StatusBadgeProps) {
  const cfg = CONFIG[status];
  const Icon = cfg.icon;

  return (
    <Badge
      variant="outline"
          className={cn(
        "gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wider",
        cfg.className,
        className,
      )}
    >
      <Icon
        className={cn("h-3 w-3", cfg.spin && "animate-spin")}
        aria-hidden="true"
      />
      {!iconOnly && <span>{cfg.label}</span>}
    </Badge>
  );
}