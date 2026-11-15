import { useEffect, useState } from "react";
import type { ChatState, DialogRequest } from "../lib/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, X,ShieldCheck } from "lucide-react";
import { Faq } from "@/components/ui/faq";

export function DialogHost({
  dialogs,
  onRespond,
}: {
  dialogs: DialogRequest[];
  onRespond: (d: DialogRequest, response: any) => void;
}) {
  const d = dialogs[0];
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    setValue(d?.prefill ?? "");
    setSelected(0);
  }, [d?.id]);

  if (!d) return null;

  const cancel = () => onRespond(d, { cancelled: true });
  const submit = () => {
    if (d.method === "confirm") onRespond(d, { confirmed: true });
    else if (d.method === "select") onRespond(d, { value: (d.options ?? [])[selected] });
    else onRespond(d, { value });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && cancel()}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0" showCloseButton={false}>
        <DialogHeader className="border-b border-border px-5 py-3.5">
          <DialogTitle className="flex items-center gap-2 text-[13.5px]">
            {d.method === "confirm"?"Permission requested":d.method === "select" ? "A question from OMP" : d.title ?? d.method}
            {dialogs.length > 1 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[9.5px] font-normal">
                {dialogs.length} pending
              </Badge>
            )}
          </DialogTitle>
          {d.message && d.method!=="confirm" && (
            <DialogDescription className="text-[12px] leading-relaxed text-muted-foreground">{d.message}</DialogDescription>
          )}
        </DialogHeader>

        <div
          className="max-h-[50vh] overflow-auto p-4"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && d.method === "input" && (e.target as HTMLElement).tagName === "INPUT" && !(e.nativeEvent.isComposing)) {
              e.preventDefault();
              submit();
            }
          }}
        >
          {d.method === "select" && (
            <Faq key={d.id} defaultValue="question" accent="var(--secondary)" avatar={null} className="[&_[data-slot=faq-answer]>div]:max-w-full [&_[data-slot=faq-answer]>div]:text-foreground" items={[{ id: "question", question: d.title ?? "OMP has a question", answer: <div className="space-y-1" role="radiogroup" aria-label={d.title ?? "Choose an answer"}>
              {(d.options ?? []).map((o, i) => (
                <button
                  key={i}
                  role="radio"
                  aria-checked={selected === i}
                  onClick={() => setSelected(i)}
                  onKeyDown={e => {
                    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                    e.preventDefault();
                    const options = Array.from(e.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>("[role=radio]"));
                    const next = (i + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
                    setSelected(next); options[next]?.focus();
                  }}
                  onDoubleClick={() => onRespond(d, { value: o })}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[12.5px] transition-colors ${
                    selected === i ? "bg-primary/12 text-primary" : "text-fog-200 hover:bg-muted"
                  }`}
                >
                  <span className="font-mono text-[10.5px] text-muted-foreground">{i + 1}</span>
                  <span className="truncate">{o}</span>
                  {selected === i && <Check className="ml-auto size-3 text-primary" />}
                </button>
              ))}
            </div> }]} />
          )}

          {(d.method === "input" || d.method === "editor") &&
            (d.method === "editor" ? (
              <Textarea
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={10}
                className="resize-y font-mono text-[12.5px]"
              />
            ) : (
              <Input autoFocus value={value} placeholder={d.placeholder} onChange={(e) => setValue(e.target.value)} className="text-[13px]" />
            ))}

          {d.method === "confirm" && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/40 p-4"><ShieldCheck className="size-5 shrink-0 text-muted-foreground"/><div className="min-w-0 flex-1"><p className="text-sm font-medium">{d.title||"Allow this action?"}</p>{d.message&&<p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{d.message}</p>}</div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={()=>onRespond(d,{confirmed:false})}>Deny</Button><Button size="sm" onClick={submit}>Approve</Button></div></div>}
        </div>

        {d.method!=="confirm"&&<DialogFooter className="flex-row items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" onClick={cancel} className="text-[12px] text-muted-foreground">
            Cancel
          </Button>
          {d.method === "confirm" ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => onRespond(d, { confirmed: false })} className="text-[12px]">
                Deny
              </Button>
              <Button size="sm" onClick={submit} className="text-[12px]">
                Approve
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={submit} className="text-[12px]">
              {d.method === "select" ? "Select" : "Submit"}
            </Button>
          )}
        </DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

export function Toasts({ chat, onDismiss }: { chat: ChatState; onDismiss: (id: string) => void }) {
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
