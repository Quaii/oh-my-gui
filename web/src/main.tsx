import React from "react";
import { createRoot } from "react-dom/client";
import {WorkspaceMotion} from "./components/transitions/WorkspaceMotion";
import App from "./App";
import { TooltipProvider } from "@/components/ui/tooltip";
import { applyTheme, getTheme } from "./lib/theme";
import "./index.css";
const BackgroundPreview=React.lazy(()=>import("./components/backgrounds/BackgroundPreview").then(m=>({default:m.BackgroundPreview})));

if(window.__OMP_DESKTOP__)document.documentElement.dataset.desktop="true";
applyTheme(getTheme());

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={300}>
      {location.pathname==="/background-preview"?<React.Suspense fallback={null}><BackgroundPreview/></React.Suspense>:<WorkspaceMotion><App /></WorkspaceMotion>}
    </TooltipProvider>
  </React.StrictMode>
);
