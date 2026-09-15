import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DeviceCapability, DeviceMeta, DeviceStatus } from "@/types/device";

interface DeviceCardProps {
  device: DeviceMeta;
  status: DeviceStatus;
  capability: DeviceCapability;
}

export function DeviceCard({ device, status, capability }: DeviceCardProps) {
  const Icon = device.icon;

  // Nếu trình duyệt không hỗ trợ → override status
  const effectiveStatus: DeviceStatus = capability.supported
    ? status
    : "not-available";

  const isDisabled = !capability.supported;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
            <Icon
              className="h-5 w-5 text-secondary-foreground"
              aria-hidden="true"
            />
          </div>
          <StatusBadge status={effectiveStatus} />
        </div>
        <CardTitle className="pt-2">{device.title}</CardTitle>
        <CardDescription>{device.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {!capability.supported && capability.reason && (
          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-xs">
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning"
              aria-hidden="true"
            />
            <p className="text-muted-foreground">{capability.reason}</p>
          </div>
        )}
      </CardContent>

      <CardFooter>
        {isDisabled ? (
          <Button className="w-full" size="sm" disabled>
            Not available
          </Button>
        ) : (
          <Button asChild className="w-full" size="sm">
            <Link to={device.path}>
              Test {device.title}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}