import { useEffect, useState } from "react";
import type { ChatState } from "../../lib/store";
import { blockText } from "../../lib/store";
import {
  validateTodoPhases,
  type NativeTodoPhase,
} from "../../lib/native-todos";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Group } from "./Controls";
import { flattenNativeTree } from "../../lib/native-tree";
import { HostIntegration } from "./HostIntegration";

type Command = (command: any) => Promise<any>;
export function SessionWorkflows({
  chat,
  cmd,
}: {
  chat: ChatState;
  cmd: Command;
}) {
  const [objective, setObjective] = useState(""),
    [budget, setBudget] = useState("");
  const [phases, setPhases] = useState<NativeTodoPhase[]>([]),
    [dirty, setDirty] = useState(false);
  const [entries, setEntries] = useState<any[]>([]),
    [entryId, setEntryId] = useState(""),
    [label, setLabel] = useState("");
  const [summarize, setSummarize] = useState(false),
    [instructions, setInstructions] = useState("");
  const [shell, setShell] = useState(""),
    [exclude, setExclude] = useState(true),
    [shellOutput, setShellOutput] = useState("");
  const [question, setQuestion] = useState(""),
    [topic, setTopic] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [result, setResult] = useState("");
  const [directory, setDirectory] = useState("");
  const goal = chat.state?.goal?.goal ?? chat.state?.goal;
  useEffect(() => {
    if (!dirty) setPhases(structuredClone(chat.todos ?? []));
  }, [chat.todos, dirty]);
  async function run(command: any, receive?: (data: any) => void) {
    setError("");
    setBusy(command.type);
    try {
      const response = await cmd(command);
      if (!response?.ok)
        throw new Error(response?.error || "OMP did not accept the command");
      receive?.(response.data);
      return response.data;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setBusy("");
    }
  }
  function edit(next: NativeTodoPhase[]) {
    setDirty(true);
    setPhases(next);
  }
  function downloadPlan() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(phases, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "omp-task-plan.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {result && (
        <p
          role="status"
          className="whitespace-pre-wrap text-xs text-muted-foreground"
        >
          {result}
        </p>
      )}
      <Group title="Goal">
        <div className="space-y-3 py-4">
          {goal?.objective ? (
            <>
              <p className="text-sm">{goal.objective}</p>
              <p className="text-xs text-muted-foreground">
                {goal.status} · {goal.tokensUsed?.toLocaleString() ?? "—"}
                {goal.tokenBudget
                  ? ` / ${goal.tokenBudget.toLocaleString()}`
                  : ""}{" "}
                tokens · {goal.timeUsedSeconds ?? 0}s
              </p>
              <div className="flex flex-wrap gap-2">
                {["pause", "resume", "drop"].map((op) => (
                  <Button
                    key={op}
                    size="sm"
                    variant="outline"
                    disabled={!!busy}
                    onClick={() => void run({ type: "goal", op })}
                  >
                    {op}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <>
              <Textarea
                rows={2}
                aria-label="Goal objective"
                placeholder="What should the agent accomplish?"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              />
              <Input
                type="number"
                min={1}
                step={1}
                aria-label="Optional goal token budget"
                placeholder="Token budget (optional)"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
              <Button
                size="sm"
                disabled={
                  !!busy ||
                  !objective.trim() ||
                  (!!budget &&
                    (!Number.isSafeInteger(Number(budget)) ||
                      Number(budget) < 1))
                }
                onClick={() =>
                  void run({
                    type: "goal",
                    op: "create",
                    objective,
                    ...(budget ? { token_budget: Number(budget) } : {}),
                  })
                }
              >
                Start goal
              </Button>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            Automatic goal continuation follows OMP’s goal.continuationModes
            configuration.
          </p>
        </div>
      </Group>
      <Group title="Task plan">
        <div className="space-y-4 py-4">
          {phases.map((phase, phaseIndex) => (
            <fieldset key={phaseIndex} className="space-y-2">
              <div className="flex gap-2">
                <Input
                  aria-label={`Phase ${phaseIndex + 1} name`}
                  value={phase.name}
                  onChange={(e) =>
                    edit(
                      phases.map((p, i) =>
                        i === phaseIndex ? { ...p, name: e.target.value } : p,
                      ),
                    )
                  }
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    edit(phases.filter((_, i) => i !== phaseIndex))
                  }
                >
                  Remove phase
                </Button>
              </div>
              {phase.tasks.map((task, taskIndex) => (
                <div key={taskIndex} className="flex flex-wrap gap-2">
                  <Input
                    aria-label={`Task ${taskIndex + 1}`}
                    className="min-w-48 flex-1"
                    value={task.content}
                    onChange={(e) =>
                      edit(
                        phases.map((p, i) =>
                          i === phaseIndex
                            ? {
                                ...p,
                                tasks: p.tasks.map((t, j) =>
                                  j === taskIndex
                                    ? { ...t, content: e.target.value }
                                    : t,
                                ),
                              }
                            : p,
                        ),
                      )
                    }
                  />
                  <select
                    aria-label={`Task ${taskIndex + 1} status`}
                    className="rounded-md border bg-sidebar px-2 text-xs"
                    value={task.status}
                    onChange={(e) =>
                      edit(
                        phases.map((p, i) =>
                          i === phaseIndex
                            ? {
                                ...p,
                                tasks: p.tasks.map((t, j) =>
                                  j === taskIndex
                                    ? { ...t, status: e.target.value }
                                    : t,
                                ),
                              }
                            : p,
                        ),
                      )
                    }
                  >
                    {["pending", "in_progress", "completed", "abandoned"].map(
                      (status) => (
                        <option key={status}>{status}</option>
                      ),
                    )}
                  </select>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      edit(
                        phases.map((p, i) =>
                          i === phaseIndex
                            ? {
                                ...p,
                                tasks: p.tasks.filter(
                                  (_, j) => j !== taskIndex,
                                ),
                              }
                            : p,
                        ),
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  edit(
                    phases.map((p, i) =>
                      i === phaseIndex
                        ? {
                            ...p,
                            tasks: [
                              ...p.tasks,
                              { content: "", status: "pending" },
                            ],
                          }
                        : p,
                    ),
                  )
                }
              >
                Add task
              </Button>
            </fieldset>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => edit([...phases, { name: "Tasks", tasks: [] }])}
            >
              Add phase
            </Button>
            <Button
              size="sm"
              disabled={!!busy || !dirty}
              onClick={() => {
                try {
                  void run(
                    { type: "set_todos", phases: validateTodoPhases(phases) },
                    () => setDirty(false),
                  );
                } catch (e: any) {
                  setError(e.message);
                }
              }}
            >
              Save plan
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDirty(false);
                setPhases(structuredClone(chat.todos));
              }}
            >
              Reload native plan
            </Button>
            <Button size="sm" variant="ghost" onClick={downloadPlan}>
              Export
            </Button>
            <label className="cursor-pointer text-xs underline">
              Import
              <input
                className="sr-only"
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    if (file.size > 2 * 1024 * 1024)
                      throw Error("Task plans must be under 2 MB");
                    edit(validateTodoPhases(JSON.parse(await file.text())));
                  } catch (error: any) {
                    setError(error.message);
                  }
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {dirty && (
            <p className="text-xs text-muted-foreground">
              Unsaved plan. Native changes are loaded when you choose Reload
              native plan.
            </p>
          )}
        </div>
      </Group>
      <Group title="Branches and checkpoints">
        <div className="space-y-3 py-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void run({ type: "get_tree" }, (data) =>
                  setEntries(flattenNativeTree(data.tree ?? [])),
                )
              }
            >
              Load branch tree
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void run({ type: "get_entries" }, (data) =>
                  setEntries(data.entries ?? []),
                )
              }
            >
              Append history
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void run({ type: "get_branch_messages" }, (data) =>
                  setResult(
                    data.messages
                      .map((message: any) => message.text)
                      .join("\n\n"),
                  ),
                )
              }
            >
              Read active branch
            </Button>
          </div>
          {entries.length > 0 && (
            <>
              <select
                aria-label="Session entry"
                className="w-full rounded-md border bg-sidebar p-2 text-sm"
                value={entryId}
                onChange={(e) => setEntryId(e.target.value)}
              >
                <option value="">Choose a checkpoint…</option>
                {entries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {"　".repeat(Math.min(entry.depth ?? 0, 16))}{entry.id.slice(0, 8)} · {entry.type} ·{" "}
                    {entry.label ||
                      blockText(entry.message?.content).slice(0, 100) ||
                      entry.summary ||
                      ""}
                  </option>
                ))}
              </select>
              <Input
                aria-label="Branch label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label this checkpoint"
              />
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={summarize}
                  onChange={(e) => setSummarize(e.target.checked)}
                />
                Summarize the abandoned branch (uses the session model)
              </label>
              <Textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                aria-label="Summary and handoff instructions"
                placeholder="Optional summary or handoff instructions"
              />
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    title: "Continue here",
                    command: {
                      type: "navigate_tree",
                      entryId,
                      summarize,
                      customInstructions: instructions || undefined,
                    },
                  },
                  {
                    title: "Branch here",
                    command: { type: "branch", entryId },
                  },
                  { title: "Fork here", command: { type: "fork", entryId } },
                  {
                    title: "Set label",
                    command: {
                      type: "set_label",
                      entryId,
                      label: label || undefined,
                    },
                  },
                ].map((action) => (
                  <Button
                    key={action.title}
                    size="sm"
                    variant="outline"
                    disabled={!entryId || !!busy}
                    onClick={() => void run(action.command)}
                  >
                    {action.title}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void run({ type: "abort_branch_summary" })}
                >
                  Stop summary
                </Button>
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!!busy}
              onClick={() =>
                void run({
                  type: "compact",
                  customInstructions: instructions || undefined,
                })
              }
            >
              Compact with instructions
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!!busy}
              onClick={() =>
                void run(
                  {
                    type: "handoff",
                    customInstructions: instructions || undefined,
                  },
                  (data) =>
                    setResult(
                      data?.savedPath
                        ? `Handoff saved to ${data.savedPath}`
                        : "OMP returned no saved handoff path.",
                    ),
                )
              }
            >
              Create handoff
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void run({ type: "get_last_assistant_text" }, (data) => {
                  if (data.text) void navigator.clipboard.writeText(data.text);
                })
              }
            >
              Copy last response
            </Button>
          </div>
        </div>
      </Group>
      <Group title="Session execution">
        <div className="space-y-3 py-4">
          <label className="block space-y-2 text-sm">
            Open a session directory
            <Input
              aria-label="Session directory"
              value={directory}
              onChange={(e) => setDirectory(e.target.value)}
              placeholder="Folder containing an OMP session"
            />
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={!directory.trim() || !!busy}
            onClick={() =>
              void run({ type: "open_session", sessionDir: directory })
            }
          >
            Open directory session
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              void run(
                {
                  type: "get_session_lease",
                  sessionIds: [chat.state?.sessionId].filter(Boolean),
                },
                (data) => setResult(JSON.stringify(data, null, 2)),
              )
            }
          >
            Check session ownership
          </Button>
          <label className="flex items-center justify-between gap-3 text-sm">
            Interrupt delivery
            <select
              className="rounded-md border bg-sidebar p-2 text-xs"
              value={chat.state?.interruptMode ?? "immediate"}
              onChange={(e) =>
                void run({ type: "set_interrupt_mode", mode: e.target.value })
              }
            >
              <option value="immediate">Immediate</option>
              <option value="wait">Wait</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            Cache warming
            <select
              aria-label="Cache warming"
              defaultValue=""
              className="rounded-md border bg-sidebar p-2 text-xs"
              onChange={(e) =>
                void run(
                  { type: "set_cache_warming", mode: e.target.value },
                  (data) => setResult(`Cache warming: ${data.mode}`),
                )
              }
            >
              <option value="" disabled>
                Set mode…
              </option>
              {["off", "streaming", "idle"].map((mode) => (
                <option key={mode}>{mode}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void run({ type: "abort_retry" })}
            >
              Stop retry
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void run({ type: "cycle_model" })}
            >
              Cycle model
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void run({ type: "cycle_thinking_level" })}
            >
              Cycle thinking
            </Button>
          </div>
          <Textarea
            rows={2}
            value={shell}
            onChange={(e) => setShell(e.target.value)}
            aria-label="Shell command"
            placeholder="Run a shell command in this session…"
          />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={exclude}
              onChange={(e) => setExclude(e.target.checked)}
            />
            Exclude command and output from model context
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!shell.trim() || busy === "bash"}
              onClick={() =>
                void run(
                  { type: "bash", command: shell, excludeFromContext: exclude },
                  (data) =>
                    setShellOutput(
                      data.output ?? data.stdout ?? JSON.stringify(data),
                    ),
                )
              }
            >
              Run command
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void run({ type: "abort_bash" })}
            >
              Stop command
            </Button>
          </div>
          {shellOutput && (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">
              {shellOutput}
            </pre>
          )}
        </div>
      </Group>
      <HostIntegration chatKey={chat.key} />
      <Group title="Side questions">
        <div className="space-y-3 py-4">
          <p className="text-xs text-muted-foreground">
            An ephemeral model answer using this session’s context. It does not
            edit files or join the main transcript.
          </p>
          <select
            aria-label="Side-question topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-md border bg-sidebar p-2 text-xs"
          >
            <option value="">New topic</option>
            {chat.sideQuestions.map((record) => (
              <option key={record.id} value={record.id}>
                {record.question}
              </option>
            ))}
          </select>
          <Textarea
            rows={2}
            aria-label="Side question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a side question…"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!question.trim() || !!busy}
              onClick={() =>
                void run(
                  {
                    type: "btw",
                    question,
                    ...(topic ? { recordId: topic } : {}),
                  },
                  () => setQuestion(""),
                )
              }
            >
              Ask
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void run({
                  type: "btw_cancel",
                  ...(topic ? { recordId: topic } : {}),
                })
              }
            >
              Stop answer
            </Button>
          </div>
          {chat.sideQuestions.map((record) => (
            <details
              key={record.id}
              open={record.status === "running"}
              className="rounded-lg border p-3"
            >
              <summary className="cursor-pointer text-sm">
                {record.question}{" "}
                <span className="text-xs text-muted-foreground">
                  {record.status}
                </span>
              </summary>
              {[record, ...(record.followUps ?? [])].map((turn, i) => (
                <div key={i} className="mt-3 whitespace-pre-wrap text-sm">
                  {i > 0 && <p className="mb-2 font-medium">{turn.question}</p>}
                  {turn.answer}
                  {turn.error && (
                    <p className="text-destructive">{turn.error}</p>
                  )}
                </div>
              ))}
            </details>
          ))}
        </div>
      </Group>
    </div>
  );
}
