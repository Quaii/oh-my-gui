import {ErrorBoundary} from "./components/ErrorBoundary";
import {DesktopLifecycle} from "./components/DesktopLifecycle";
import {DesktopTray} from './components/DesktopTray';
import {DesktopUpdateNotice} from "./components/DesktopUpdateNotice";
import React from "react";
import {DesktopSetup} from './components/DesktopSetup';
import {DesktopInstaller} from './components/DesktopInstaller';
import { createRoot } from "react-dom/client";
import {WorkspaceMotion} from "./components/transitions/WorkspaceMotion";
import App from "./App";
import { TooltipProvider } from "@/components/ui/tooltip";
import { applyTheme, getTheme } from "./lib/theme";
import "./index.css";
const BackgroundPreview=React.lazy(()=>import("./components/backgrounds/BackgroundPreview").then(m=>({default:m.BackgroundPreview})));

if(window.__OMP_DESKTOP__)document.documentElement.dataset.desktop="true";
if(window.__OMP_CUSTOM_CHROME__)document.documentElement.dataset.desktopChrome="true";
if(window.__OMP_DESKTOP__&&!window.__OMP_TRAY__)document.documentElement.dataset.desktopSetup="true";
if(window.__OMP_TRAY__)document.documentElement.dataset.tray="true";
applyTheme(window.__OMP_INSTALLER__ ? 'carbon' : getTheme());

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={300}>
      {window.__OMP_TRAY__ ? <ErrorBoundary><DesktopTray/></ErrorBoundary> : <>
      {window.__OMP_DESKTOP__&&!window.__OMP_INSTALLER__&&<DesktopLifecycle/>}
      {window.__OMP_DESKTOP__&&!window.__OMP_INSTALLER__&&<DesktopUpdateNotice/>}
      <ErrorBoundary>{location.pathname==="/background-preview"?<React.Suspense fallback={null}><BackgroundPreview/></React.Suspense>:<WorkspaceMotion>{window.__OMP_INSTALLER__ ? <DesktopInstaller /> : window.__OMP_DESKTOP__ ? <DesktopSetup><App /></DesktopSetup> : <App />}</WorkspaceMotion>}
    </ErrorBoundary></>}
    </TooltipProvider>
  </React.StrictMode>
);
