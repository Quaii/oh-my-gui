import type { ChatState } from "../lib/store";
import { Button } from "./ui/button";
import { isDeviceMountNotice } from "../lib/conversation-actions";

export function AuthLinkActions({ link }: { link: ChatState['authLinks'][number] }) {
  return <div className="flex flex-wrap items-center gap-2">
    <Button variant="outline" size="sm" asChild>
      <a href={link.url} target="_blank" rel="noopener noreferrer">Open sign-in page</a>
    </Button>
    <Button variant="ghost" size="sm" onClick={() => void navigator.clipboard.writeText(link.url)}>Copy link</Button>
  </div>;
}

export function RuntimeOutput({
  outputs,
  links = [],
}: {
  outputs: ChatState["outputs"];
  links?: ChatState["authLinks"];
}) {
  const visibleOutputs = outputs.filter(output => !isDeviceMountNotice(output.text, output.kind));
  if (!visibleOutputs.length && !links.length) return null;
  return (
    <div className="space-y-3" aria-live="polite">
      {links.map((link) => (
        <div
          key={link.id}
          className="workspace-floating-surface rounded-xl border p-4"
        >
          <p className="mb-2 text-sm">
            {link.instructions || "Continue sign-in in your browser."}
          </p>
          <AuthLinkActions link={link} />
        </div>
      ))}
      {visibleOutputs.map((output) => (
        <details
          open
          key={output.id}
          className="workspace-floating-surface rounded-xl border p-4"
        >
          <summary
            className={`cursor-pointer text-xs font-medium ${output.kind === "error" ? "text-destructive" : "text-muted-foreground"}`}
          >
            OMP output
          </summary>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
            {output.text.length > 65536
              ? "…" + output.text.slice(-65536)
              : output.text}
          </pre>
          <div className="mt-2 flex justify-end gap-2">
            {output.text.length > 65536 && (
              <span className="mr-auto text-xs text-muted-foreground">
                Showing the last 64 KB. Copy retains the complete output.
              </span>
            )}
            <Button
              variant="ghost"
              size="xs"
              onClick={() => void navigator.clipboard.writeText(output.text)}
            >
              Copy output
            </Button>
          </div>
        </details>
      ))}
    </div>
  );
}

export function ExtensionWidgets({
  widgets,
  placement,
}: {
  widgets: ChatState["widgets"];
  placement: string;
}) {
  return (
    <>
      {Object.entries(widgets)
        .filter(([, widget]) => widget.placement === placement)
        .map(([key, widget]) => (
          <div
            key={key}
            className="my-2 rounded-lg border bg-sidebar px-3 py-2 font-mono text-xs text-muted-foreground"
          >
            {widget.lines.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        ))}
    </>
  );
}
