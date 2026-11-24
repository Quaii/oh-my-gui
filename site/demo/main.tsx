import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "../../web/src/components/ErrorBoundary";
import { WorkspaceMotion } from "../../web/src/components/transitions/WorkspaceMotion";
import { TooltipProvider } from "../../web/src/components/ui/tooltip";
import { APP_THEMES, applyTheme, DEFAULT_THEME, getTheme } from "../../web/src/lib/theme";
import { SettingsPage } from "../../web/src/pages/SettingsPage";
import "./demo.css";

applyTheme(DEFAULT_THEME);

function reportTheme() {
  window.parent.postMessage({ type: "omp:appearance-demo-current", theme: getTheme() }, window.location.origin);
}

window.addEventListener("omp:appearance", reportTheme);
reportTheme();

window.addEventListener("message", event => {
  if (event.origin !== window.location.origin || event.source !== window.parent) return;
  if (event.data?.type !== "omp:appearance-demo-theme") return;
  const theme = APP_THEMES.find(option => option.value === event.data.theme);
  if (theme) applyTheme(theme.value);
});

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
