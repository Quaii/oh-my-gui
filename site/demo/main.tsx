import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "../../web/src/components/ErrorBoundary";
import { WorkspaceMotion } from "../../web/src/components/transitions/WorkspaceMotion";
import { TooltipProvider } from "../../web/src/components/ui/tooltip";
import { applyTheme, DEFAULT_THEME } from "../../web/src/lib/theme";
import { SettingsPage } from "../../web/src/pages/SettingsPage";
import "./demo.css";

applyTheme(DEFAULT_THEME);

createRoot(document.getElementById("root")!).render(
  <TooltipProvider delayDuration={300}>
    <ErrorBoundary>
      <WorkspaceMotion>
        <div className="app-shell relative isolate flex h-full w-full overflow-hidden bg-background text-foreground">
          <div className="workspace-route flex h-full min-h-0 min-w-0 flex-1">
            <SettingsPage appearancePreview />
          </div>
        </div>
      </WorkspaceMotion>
    </ErrorBoundary>
  </TooltipProvider>
);
