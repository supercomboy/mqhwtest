import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SkipToContent } from "@/components/common/SkipToContent";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { cn } from "@/lib/utils";

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Đóng drawer mỗi khi đổi route
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Khoá scroll body khi drawer mở trên mobile
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Đóng drawer bằng ESC
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

    return (
    <div className="flex h-full bg-background text-foreground">
      <SkipToContent />

      {/* Sidebar desktop — cố định */}
           <aside className="hidden w-60 shrink-0 border-r border-border bg-card lg:block">
        <Sidebar />
      </aside>

      {/* Sidebar mobile — drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!drawerOpen}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity",
            drawerOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setDrawerOpen(false)}
        />
        {/* Panel */}
        <aside
          className={cn(
            "absolute left-0 top-0 h-full w-60 border-r border-border bg-card shadow-lg transition-transform duration-200 ease-out",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-14 items-center border-b border-border px-4">
            <span className="font-semibold tracking-tight">
              MQ Device Tester
            </span>
          </div>
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </aside>
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setDrawerOpen(true)} />
                <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}