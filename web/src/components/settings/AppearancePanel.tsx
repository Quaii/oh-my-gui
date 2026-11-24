import { AppearanceControls } from "../Appearance";
import { AppearanceEditor } from "./AppearanceEditor";
import { SettingsHeading } from "./SettingsHeading";

export function AppearancePanel() {
  return (
    <>
      <section className="settings-group">
        <SettingsHeading title="Workspace theme" />
        <div className="settings-card"><AppearanceControls expanded /></div>
      </section>
      <AppearanceEditor />
    </>
  );
}
