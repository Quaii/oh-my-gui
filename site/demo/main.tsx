import { createRoot } from "react-dom/client";
import { WorkspaceBackground } from "../../web/src/components/Appearance";
import { Brand } from "../../web/src/components/Brand";
import { FileIcon } from "../../web/src/components/FileIcon";
import { MessageRow } from "../../web/src/components/Message";
import { Folder, MessageSquare } from "../../web/src/components/NavigationIcons";
import { AppearancePanel } from "../../web/src/components/settings/AppearancePanel";
import { SettingsHeading } from "../../web/src/components/settings/SettingsHeading";
import { TooltipProvider } from "../../web/src/components/ui/tooltip";
import { APP_THEMES, applyTheme, getTheme } from "../../web/src/lib/theme";
import "./demo.css";

applyTheme(getTheme());

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

const exampleMessages = [
  { role: "user", content: "What should we check before shipping the importer?" },
  {
    role: "assistant",
    content: [
      "Start with the CSV cases that are easiest to miss.",
      "",
      "- Quoted separators and blank fields",
      "- Files with a trailing empty row",
      "- UTF-8 files with a byte order mark",
      "",
      "Then run the import tests.",
      "",
      "```sh",
      "npm test",
      "```",
    ].join("\n"),
  },
];

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <main className="appearance-demo">
      <div className="demo-workspace">
        <WorkspaceBackground />
        <aside className="demo-sidebar session-sidebar" aria-label="Sample project">
          <div className="demo-brand"><Brand /> omp.</div>
          <div className="demo-sidebar-row"><Folder className="size-4" /> Atlas</div>
          <div className="demo-sidebar-row demo-selected"><MessageSquare className="size-4" /> Release checks</div>
          <div className="demo-sidebar-row"><FileIcon path="import.ts" /> import.ts</div>
        </aside>
        <section className="demo-preview" aria-labelledby="demo-chat">
          <header className="demo-chat-header">
            <span>Atlas</span>
            <h1 id="demo-chat">Plan the next release</h1>
          </header>
          <div className="demo-messages">
            {exampleMessages.map(message => <MessageRow key={message.role} message={message} tools={{}} results={{}} />)}
          </div>
        </section>
      </div>
      <section className="demo-settings settings-main" aria-label="Appearance settings">
        <div className="settings-stack">
          <SettingsHeading level="h1" title="Appearance" description="Changes apply to the sample workspace as you make them." />
          <AppearancePanel />
        </div>
      </section>
    </main>
  </TooltipProvider>
);
