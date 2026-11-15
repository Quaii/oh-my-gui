import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { MessageSquarePlus, Settings2, RefreshCw, FolderGit2, Terminal, Sparkles } from "lucide-react";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  commands: any[];
  sessions: any[];
  activePath: string | null;
  onSlash: (name: string) => void;
  onNew: () => void;
  onOpenFiles: () => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
  onOpenSession: (s: any) => void;
}

export function CommandPalette(props: CommandPaletteProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "e") {e.preventDefault();props.onOpenFiles();return;}
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        props.onOpenChange(!props.open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.open, props.onOpenChange, props.onOpenFiles]);

  const run = (fn: () => void) => {
    props.onOpenChange(false);
    setTimeout(fn, 10);
  };

  return (
    <CommandDialog open={props.open} onOpenChange={props.onOpenChange} title="Command" description="Run a command or jump to a session">
      <CommandInput placeholder="Run a command, open a session…" />
      <CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem value="new session create" onSelect={() => run(props.onNew)}>
            <MessageSquarePlus className="size-3.5" /> New session
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem value="open files file browser explorer editor" onSelect={() => run(props.onOpenFiles)}><FolderGit2 className="size-3.5"/> Open files<CommandShortcut>Ctrl+Shift+E</CommandShortcut></CommandItem>
          <CommandItem value="settings preferences config" onSelect={() => run(props.onOpenSettings)}>
            <Settings2 className="size-3.5" /> Settings
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
          <CommandItem value="refresh reload sessions" onSelect={() => run(props.onRefresh)}>
            <RefreshCw className="size-3.5" /> Refresh sessions
          </CommandItem>
        </CommandGroup>

        {props.commands.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Slash commands">
              {props.commands.map((c) => (
                <CommandItem key={c.name} value={`slash ${c.name} ${c.description ?? ""}`} onSelect={() => run(() => props.onSlash(c.name))}>
                  <Terminal className="size-3.5" />
                  <span className="font-mono text-[12px] text-primary">/{c.name}</span>
                  <span className="truncate text-[11.5px] text-muted-foreground">{c.description}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {props.sessions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Sessions">
              {props.sessions.slice(0, 30).map((s) => (
                <CommandItem
                  key={s.path}
                  value={`session ${s.name ?? ""} ${s.preview ?? ""} ${s.id}`}
                  onSelect={() => run(() => props.onOpenSession(s))}
                >
                  <Sparkles className={`size-3.5 ${s.path === props.activePath ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="truncate">{s.name || s.preview || s.id}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{s.messageCount ?? 0} msg</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
