import type { ReactNode } from "react";

export function SettingsHeading({ title, description, action, level = "h2" }: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  level?: "h1" | "h2" | "h3";
}) {
  const Heading = level;
  return (
    <header className={level === "h1" ? "settings-heading settings-page-heading" : "settings-heading"}>
      <div className="settings-heading-copy">
        <Heading className="settings-heading-title">{title}</Heading>
        {description && <p className="settings-heading-description">{description}</p>}
      </div>
      {action && <div className="settings-heading-action">{action}</div>}
    </header>
  );
}
