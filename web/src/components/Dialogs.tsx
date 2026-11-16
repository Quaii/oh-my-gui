import { useEffect, useRef, useState } from "react";
import type { ChatState, DialogRequest } from "../lib/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import {
  initialAnswers,
  changeAnswer,
  dialogDeadline,
} from "../lib/native-dialog";

export function DialogHost({
  dialogs,
  onRespond,
}: {
  dialogs: DialogRequest[];
  onRespond: (d: DialogRequest, response: any) => unknown;
}) {
  const d = dialogs[0];
  return d ? (
    <NativeDialog
      key={d.id}
      d={d}
      count={dialogs.length}
      onRespond={onRespond}
    />
  ) : null;
}
function NativeDialog({
  d,
  count,
  onRespond,
}: {
  d: DialogRequest;
  count: number;
  onRespond: (d: DialogRequest, response: any) => unknown;
}) {
  const [value, setValue] = useState(d.prefill ?? "");
  const [selected, setSelected] = useState(
    Math.max(0, Math.min(d.initialIndex ?? 0, (d.options?.length ?? 1) - 1)),
  );
  const [answers, setAnswers] = useState(() =>
    initialAnswers(d.questions ?? []),
  );
  const [pending, setPending] = useState(false);
  const initialOption = useRef<HTMLButtonElement>(null);
  const sent = useRef(false);
  const responder = useRef(onRespond);
  responder.current = onRespond;
  const respond = (response: any) => {
    if (sent.current) return;
    sent.current = true;
    setPending(true);
    void Promise.resolve(responder.current(d, response))
      .then((accepted) => {
        if (accepted === false) {
          sent.current = false;
          setPending(false);
        }
      })
      .catch(() => {
        sent.current = false;
        setPending(false);
      });
  };
  useEffect(() => {
    const deadline = dialogDeadline(d);
    if (deadline === null) return;
    const timer = window.setTimeout(
      () => respond({ cancelled: true, timedOut: true }),
      Math.max(0, deadline - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [d.id]);
  const cancel = () => respond({ cancelled: true });
  const checkbox = d.selectionMarker === "checkbox";
  const submit = () =>
    respond(
      d.method === "confirm"
        ? { confirmed: true }
        : d.method === "select"
          ? { value: d.options?.[selected] }
          : d.method === "ask"
            ? { answers }
            : { value },
    );
  const answered =
    d.method !== "ask" ||
    answers.every(
      (answer) => answer.selectedOptions.length || answer.customInput?.trim(),
    );
  return (
    <Dialog open onOpenChange={(open) => !open && cancel()}>
      <DialogContent
        onOpenAutoFocus={(event) => {
          if (d.method === "select" && initialOption.current) {
            event.preventDefault();
            initialOption.current.focus();
          }
        }}
        className="max-w-lg gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="whitespace-pre-wrap text-sm">
            {d.method === "confirm"
              ? "Permission requested"
              : d.title || "A question from OMP"}
            {count > 1 && (
              <span className="ml-2 text-xs text-muted-foreground">
                {count} pending
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="whitespace-pre-wrap text-xs">
            {d.message ||
              (d.method === "ask"
                ? "Choose an option or write your own answer."
                : "Your response is sent to the running agent.")}
          </DialogDescription>
        </DialogHeader>
        <div
          className="max-h-[60vh] space-y-4 overflow-auto p-5"
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              d.method === "input" &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              submit();
            }
          }}
        >
          {d.method === "select" && (
            <div
              role={checkbox ? "group" : "radiogroup"}
              aria-label={d.title}
              className="space-y-1"
            >
              {(d.options ?? []).map((option, index) => {
                const marked = index < (d.markableCount ?? d.options!.length);
                const checked = checkbox
                  ? !!d.checkedIndices?.includes(index)
                  : selected === index;
                return (
                  <button
                    ref={index === selected ? initialOption : undefined}
                    key={index}
                    disabled={pending}
                    role={
                      marked ? (checkbox ? "checkbox" : "radio") : undefined
                    }
                    aria-checked={marked ? checked : undefined}
                    onClick={() =>
                      checkbox ? respond({ value: option }) : setSelected(index)
                    }
                    onDoubleClick={() =>
                      !checkbox && respond({ value: option })
                    }
                    onKeyDown={(e) => {
                      if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
                      e.preventDefault();
                      const options = Array.from(
                        e.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                          "button",
                        ),
                      );
                      const next =
                        (index +
                          (e.key === "ArrowDown" ? 1 : -1) +
                          options.length) %
                        options.length;
                      if (!checkbox) setSelected(next);
                      options[next]?.focus();
                    }}
                    className={`flex w-full items-start gap-3 rounded-md p-3 text-left text-sm hover:bg-muted ${checked ? "bg-primary/10" : ""}`}
                  >
                    {marked && (
                      <span aria-hidden className="w-4 shrink-0 text-primary">
                        {checked ? "✓" : checkbox ? "□" : "○"}
                      </span>
                    )}
                    <span className="min-w-0 whitespace-pre-wrap">
                      {option}
                      {d.optionDetails?.[index]?.description && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {d.optionDetails[index].description}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {d.method === "ask" &&
            (d.questions ?? []).map((question, index) => (
              <fieldset key={question.id} className="space-y-2">
                <legend className="mb-2 text-sm font-medium">
                  {question.header && (
                    <span className="mb-1 block text-xs text-muted-foreground">
                      {question.header}
                    </span>
                  )}
                  {question.question}
                </legend>
                {question.options.map((option, optionIndex) => (
                  <label
                    key={option.label}
                    className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted"
                  >
                    <input
                      type={question.multi ? "checkbox" : "radio"}
                      name={question.id}
                      className="mt-1 accent-[var(--primary)]"
                      checked={answers[index].selectedOptions.includes(
                        option.label,
                      )}
                      onChange={() =>
                        setAnswers((previous) =>
                          changeAnswer(
                            previous,
                            index,
                            option.label,
                            !!question.multi,
                          ),
                        )
                      }
                    />
                    <span className="min-w-0 text-sm">
                      {option.label}
                      {optionIndex === question.recommended && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Recommended
                        </span>
                      )}
                      {option.description && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                      {option.preview && (
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs">
                          {option.preview}
                        </pre>
                      )}
                    </span>
                  </label>
                ))}
                <Textarea
                  aria-label={`Your answer to ${question.header || question.question}`}
                  rows={2}
                  placeholder="Your own answer…"
                  value={answers[index].customInput ?? ""}
                  onChange={(e) =>
                    setAnswers((previous) =>
                      previous.map((answer, i) =>
                        i === index
                          ? {
                              ...answer,
                              customInput: e.target.value,
                              selectedOptions:
                                !question.multi && e.target.value
                                  ? []
                                  : answer.selectedOptions,
                            }
                          : answer,
                      ),
                    )
                  }
                />
              </fieldset>
            ))}
          {d.method === "input" && (
            <Input
              autoFocus
              type={d.secret ? "password" : "text"}
              autoComplete="off"
              value={value}
              placeholder={d.placeholder}
              aria-label={d.title || "Answer"}
              onChange={(e) => setValue(e.target.value)}
            />
          )}
          {d.method === "editor" && (
            <Textarea
              autoFocus
              rows={10}
              value={value}
              aria-label={d.title || "Answer"}
              onChange={(e) => setValue(e.target.value)}
              className={d.promptStyle ? "" : "font-mono text-xs"}
            />
          )}
          {d.method === "confirm" && (
            <p className="whitespace-pre-wrap text-sm">
              {d.title || "Allow this action?"}
            </p>
          )}
        </div>
        <DialogFooter className="flex-row justify-end gap-2 border-t border-border px-5 py-4">
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={
              d.method === "confirm"
                ? () => respond({ confirmed: false })
                : cancel
            }
          >
            {d.method === "confirm" ? "Deny" : "Cancel"}
          </Button>
          {!checkbox && (
            <Button
              size="sm"
              disabled={
                pending ||
                !answered ||
                (d.method === "select" && !d.options?.length)
              }
              onClick={submit}
            >
              {d.method === "confirm" ? "Approve" : "Submit"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Toasts({
  chat,
  onDismiss,
}: {
  chat: ChatState;
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex w-80 flex-col gap-2">
      {chat.toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`fade-up pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px] shadow-xl backdrop-blur ${
            t.kind === "error"
              ? "border-destructive/40 bg-destructive/15 text-rose-200"
              : t.kind === "warning"
                ? "border-transparent bg-primary/10 text-primary"
                : t.kind === "success"
                  ? "border-ok/40 bg-ok/10 text-ok"
                  : "border-border bg-card/95 text-fog-200"
          }`}
        >
          <span className="min-w-0 flex-1 leading-relaxed">{t.text}</span>
          <X className="mt-0.5 size-3 shrink-0 opacity-50" />
        </div>
      ))}
    </div>
  );
}
