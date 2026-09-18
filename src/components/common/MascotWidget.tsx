import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Mascot } from "page-mascot";

import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL;

/**
 * Floating mascot ở góc dưới phải.
 * - Chỉ hiện trên desktop (≥1024px) — tránh chiếm chỗ mobile
 * - User ẩn được
 * - Không hiện khi Display fullscreen (z-index thấp hơn overlay)
 */
export function MascotWidget() {
  const [open, setOpen] = useState(true);

  return (
    <>
      {open && (
        <div className="fixed bottom-4 right-4 z-40 hidden lg:block">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Hide mascot"
              className="absolute -right-2 -top-2 z-10 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-accent"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </Button>
            <div className="w-40">
              <Mascot
                directions={`${BASE}mascots/crt-directions.webp`}
                reactions={`${BASE}mascots/crt-reactions.webp`}
              />
            </div>
          </div>
        </div>
      )}

      {!open && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Show mascot"
          className="fixed bottom-4 right-4 z-40 hidden h-10 w-10 rounded-full shadow-md lg:inline-flex"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </>
  );
}