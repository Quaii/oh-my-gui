import { NativeOperationJob } from "./NativeOperationJob";
import { useEffect, useState } from "react";
import { get, post } from "../../lib/api";
import {
  needsNativeTerminal,
  type NativeHelp,
} from "../../../../shared/native-help";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type Descriptor = NativeHelp & { path: string[]; terminal: boolean };

function OptionalChoice({ label, value, choices, onChange }: {
  label: string;
  value: string;
  choices: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value ? `choice:${value}` : "default"} onValueChange={choice => onChange(choice === "default" ? "" : choice.slice(7))}>
      <SelectTrigger aria-label={label} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="default">Default</SelectItem>
        {choices.map(choice => <SelectItem value={`choice:${choice}`} key={choice}>{choice}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export default function NativeManager({ cwd }: { cwd: string }) {
  const [path, setPath] = useState<string[]>([]),
    [descriptor, setDescriptor] = useState<Descriptor | null>(null);
  const [values, setValues] = useState<Record<string, any>>({}),
    [args, setArgs] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState(""),
    [folder, setFolder] = useState(cwd);
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [pending, setPending] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]),
    [terminal, setTerminal] = useState(""),
    [search, setSearch] = useState("");
  const pathKey = path.join("/");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setValues({});
    setArgs({});
    setTerminal("");
    get<Descriptor>("/api/native/catalog?path=" + encodeURIComponent(pathKey))
      .then((data) => {
        if (!controller.signal.aborted) setDescriptor(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [pathKey]);
  useEffect(() => {
    let alive = true,
      timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const data = await get("/api/native/operations");
        if (alive) setJobs(data.jobs);
      } catch (error: any) {
        if (alive) setError(error.message);
      }
      if (alive) timer = setTimeout(refresh, 1500);
    }
    void refresh();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);
  async function action(kind: string) {
    if (!descriptor) return;
    setPending(true);
    setError("");
    try {
      const lastFilled = descriptor.arguments.findLastIndex(
        (arg) => !!args[arg.name],
      );
      const missing = descriptor.arguments
        .slice(0, Math.max(0, lastFilled))
        .find((arg) => !args[arg.name]);
      if (missing)
        throw Error("Enter " + missing.name + " before later arguments.");
      const positionals = descriptor.arguments.flatMap((arg) =>
        args[arg.name]
          ? arg.multiple
            ? args[arg.name].split("\n").filter(Boolean)
            : [args[arg.name]]
          : [],
      );
      const response = await post("/api/native/operations", {
        action: kind,
        path,
        values,
        positionals,
        profile,
        cwd: folder,
      });
      if (kind.startsWith("terminal"))
        setTerminal(
          response.command +
            (response.launched ? "\nOpened in your terminal." : ""),
        );
      else
        setJobs((previous) => [
          response,
          ...previous.filter((job) => job.id !== response.id),
        ]);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }
  const selected = descriptor?.path.join("/") === pathKey;
  const terminalOnly =
    !path.length ||
    descriptor?.terminal ||
    needsNativeTerminal([
      ...path,
      args[descriptor?.arguments[0]?.name ?? ""] ?? "",
    ]);
  return (
    <div className="settings-stack">
      <p className="text-sm text-muted-foreground">
        Manage the installed OMP runtime. Commands and options come from this
        installation’s help. Operations run only when you choose Run; native
        terminal flows open separately.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs">
          Working folder
          <Input value={folder} onChange={(e) => setFolder(e.target.value)} />
        </label>
        <label className="space-y-1 text-xs">
          Profile (blank uses OMP’s default)
          <Input
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            placeholder="work"
          />
        </label>
      </div>
      <nav
        className="flex flex-wrap items-center gap-2"
        aria-label="Native operation path"
      >
        <Button variant="ghost" size="sm" onClick={() => setPath([])}>
          OMP
        </Button>
        {path.map((part, i) => (
          <Button
            key={i}
            variant="ghost"
            size="sm"
            onClick={() => setPath(path.slice(0, i + 1))}
          >
            {part}
          </Button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {loading && (
        <p className="text-sm text-muted-foreground" role="status">
          Reading native command help…
        </p>
      )}
      {selected && !loading && descriptor && (
        <>
          <p className="text-sm">{descriptor.description}</p>
          {descriptor.commands.length > 0 && (
            <>
              <Input
                aria-label="Find a native operation"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find an operation…"
              />
              <div className="grid gap-[var(--space-content)] sm:grid-cols-2">
                {descriptor.commands
                  .filter((command) =>
                    `${command.name} ${command.description}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((command) => (
                    <button
                      key={command.name}
                      className="settings-card settings-card-action text-left"
                      onClick={() => {
                        setPath([...path, command.name.split(/[: ]/).at(-1)!]);
                        setSearch("");
                      }}
                    >
                      <p className="text-sm font-medium">{command.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {command.description}
                      </p>
                    </button>
                  ))}
              </div>
            </>
          )}
          {descriptor && (
            <section className="settings-card settings-card-stack">
              <pre className="overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                {descriptor.usage}
              </pre>
              {descriptor.arguments.map((arg) => (
                <label key={arg.name} className="block space-y-1 text-xs">
                  <span className="font-medium">
                    {arg.name}
                    {arg.required ? " (required)" : ""}
                  </span>
                  <span className="block text-muted-foreground">
                    {arg.description}
                  </span>
                  {arg.choices.length ? (
                    <OptionalChoice
                      label={arg.name}
                      value={args[arg.name] ?? ""}
                      choices={arg.choices}
                      onChange={(value) =>
                        setArgs((previous) => ({
                          ...previous,
                          [arg.name]: value,
                        }))
                      }
                    />
                  ) : arg.multiple ? (
                    <Textarea
                      rows={3}
                      value={args[arg.name] ?? ""}
                      onChange={(e) =>
                        setArgs((previous) => ({
                          ...previous,
                          [arg.name]: e.target.value,
                        }))
                      }
                      placeholder="One argument per line"
                    />
                  ) : (
                    <Input
                      value={args[arg.name] ?? ""}
                      onChange={(e) =>
                        setArgs((previous) => ({
                          ...previous,
                          [arg.name]: e.target.value,
                        }))
                      }
                    />
                  )}
                </label>
              ))}
              {descriptor.flags.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-sm">
                    Options ({descriptor.flags.length})
                  </summary>
                  <div className="mt-4 space-y-4">
                    {descriptor.flags
                      .filter(
                        (flag) => !["--help", "--version"].includes(flag.name),
                      )
                      .map((flag) => (
                        <label
                          key={flag.name}
                          className="block space-y-1 text-xs"
                        >
                          <span className="font-mono">
                            {flag.name}
                            {flag.required ? " (required)" : ""}
                          </span>
                          <span className="block leading-relaxed text-muted-foreground">
                            {flag.description}
                          </span>
                          {!flag.value ? (
                            <input
                              type="checkbox"
                              checked={values[flag.name] === true}
                              onChange={(e) =>
                                setValues((previous) => ({
                                  ...previous,
                                  [flag.name]: e.target.checked,
                                }))
                              }
                            />
                          ) : flag.choices.length > 0 ? (
                            <OptionalChoice
                              label={flag.name}
                              value={values[flag.name] ?? ""}
                              choices={flag.choices}
                              onChange={(value) =>
                                setValues((previous) => ({
                                  ...previous,
                                  [flag.name]: value,
                                }))
                              }
                            />
                          ) : flag.repeatable ? (
                            <Textarea
                              rows={3}
                              aria-label={flag.name}
                              placeholder="One value per line"
                              value={(values[flag.name] ?? []).join("\n")}
                              onChange={(e) =>
                                setValues((previous) => ({
                                  ...previous,
                                  [flag.name]: e.target.value
                                    .split("\n")
                                    .filter(Boolean),
                                }))
                              }
                            />
                          ) : (
                            <Input
                              autoComplete="off"
                              value={
                                Array.isArray(values[flag.name])
                                  ? values[flag.name].join("\n")
                                  : (values[flag.name] ?? "")
                              }
                              onChange={(e) =>
                                setValues((previous) => ({
                                  ...previous,
                                  [flag.name]: e.target.value,
                                }))
                              }
                            />
                          )}
                        </label>
                      ))}
                  </div>
                </details>
              )}
              {terminalOnly && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  This flow uses OMP’s native terminal interface, including its
                  interactive prompts. Credential material stays in that
                  terminal.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {!terminalOnly && (
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => void action("run")}
                  >
                    Run {path.join(" ")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void action("terminal-preview")}
                >
                  Show terminal command
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void action("terminal-launch")}
                >
                  Open in terminal
                </Button>
              </div>
              {terminal && (
                <div className="space-y-2">
                  <pre className="overflow-auto whitespace-pre-wrap text-xs">
                    {terminal}
                  </pre>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      void navigator.clipboard.writeText(
                        terminal.split("\n")[0],
                      )
                    }
                  >
                    Copy command
                  </Button>
                </div>
              )}
            </section>
          )}
          <details>
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Full native help
            </summary>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs">
              {descriptor.text}
            </pre>
          </details>
        </>
      )}
      {jobs.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">Native operations</h3>
          {jobs.map((job) => (
            <NativeOperationJob
              key={job.id}
              job={job}
              cancel={async () => {
                try {
                  const response = await post("/api/native/operations", {
                    action: "cancel",
                    id: job.id,
                  });
                  setJobs((previous) =>
                    previous.map((current) =>
                      current.id === job.id ? response : current,
                    ),
                  );
                } catch (error: any) {
                  setError(error.message);
                }
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
}
