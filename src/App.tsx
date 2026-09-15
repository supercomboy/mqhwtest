import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { CameraPage } from "@/pages/CameraPage";
import { Dashboard } from "@/pages/Dashboard";
import { DisplayPage } from "@/pages/DisplayPage";
import { KeyboardPage } from "@/pages/KeyboardPage";
import { MicrophonePage } from "@/pages/MicrophonePage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { SpeakerPage } from "@/pages/SpeakerPage";
import { DeviceStatusProvider } from "@/providers/DeviceStatusProvider";
import { AriaLiveRegion } from "@/components/common/AriaLiveRegion";

function App() {
  return (
    <ThemeProvider>
      <DeviceStatusProvider>
        <AriaLiveRegion />
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="/keyboard" element={<KeyboardPage />} />
              <Route path="/speaker" element={<SpeakerPage />} />
              <Route path="/microphone" element={<MicrophonePage />} />
              <Route path="/camera" element={<CameraPage />} />
              <Route path="/display" element={<DisplayPage />} />
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </DeviceStatusProvider>
    </ThemeProvider>
  );
}

export default App;