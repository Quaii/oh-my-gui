import { useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { chatModelKey, visibleChatModels, type ChatPickerModel } from "@/lib/model-visibility";
import { ProviderIcon } from "./ProviderIcon";

export type ChatModelOption = ChatPickerModel & { contextWindow?: number };

type Props = {
  className: string;
  model?: ChatPickerModel | null;
  models: ChatModelOption[];
  hidden: string[];
  onVisibilityChange: (hidden: string[]) => void;
  onSelect: (provider: string, id: string) => void;
};

function ModelDetails({ model }: { model: ChatModelOption }) {
  return <>
    <ProviderIcon provider={model.provider} />
    <span className="min-w-0 flex-1 truncate text-[13px]">
      {model.name ?? model.id}
      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
        {model.provider}{model.contextWindow ? ` · ${Math.round(model.contextWindow / 1000)}k context` : ""}
      </span>
    </span>
  </>;
}

export function ChatModelPicker({ className, model, models, hidden, onVisibilityChange, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const focusSearch = useRef(false);
  const visible = visibleChatModels(models, hidden);
  const query = filter.trim().toLowerCase();
  const matches = (editing ? models : visible).filter(option =>
    `${option.provider}/${option.id} ${option.name ?? ""}`.toLowerCase().includes(query));
  const excluded = new Set(hidden);

  function changeMode(nextEditing: boolean) {
    focusSearch.current = true;
    setEditing(nextEditing);
    setError("");
  }

  function focusSwappedSearch(input: HTMLInputElement | null) {
    if (!input || !focusSearch.current) return;
    focusSearch.current = false;
    input.focus();
  }

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) return;
    setEditing(false);
    setFilter("");
    setError("");
  }

  function save(next: string[]) {
    try {
      onVisibilityChange(next);
      setError("");
    } catch {
      setError("Could not save model visibility on this device.");
    }
  }

  return <Popover open={open} onOpenChange={changeOpen}>
    <PopoverTrigger asChild>
      <button type="button" className={className} aria-label={`Model: ${model?.name ?? model?.id ?? "none"}`}>
        <ProviderIcon provider={model?.provider ?? ""} />
        <span className="max-w-[170px] truncate">{model?.name ?? model?.id ?? "Model"}</span>
        <ChevronDown className="size-3" />
      </button>
    </PopoverTrigger>
    <PopoverContent side="top" align="start" aria-label={editing ? "Manage model visibility" : "Choose a model"}
      className="w-[400px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl p-0">
      {editing ? <>
        <div className="relative p-1.5">
          <Search aria-hidden="true" className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input ref={focusSwappedSearch} value={filter} onChange={event => setFilter(event.target.value)}
            aria-label="Search models" placeholder="Search models" className="bg-transparent ps-9 focus-visible:ring-1" />
        </div>
        <ScrollArea viewportClassName="max-h-72">
          <div className="p-1.5">
            {matches.length === 0 && <p className="p-3 text-center text-sm text-muted-foreground">No matching models</p>}
            {matches.map(option => {
              const key = chatModelKey(option);
              return <div key={key} className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-1 focus-within:bg-accent hover:bg-accent">
                <ModelDetails model={option} />
                <Switch size="sm" aria-label={`Show ${option.name ?? option.id} (${option.provider}) in chat`}
                  checked={!excluded.has(key)} onCheckedChange={shown => save(shown ? hidden.filter(id => id !== key) : [...hidden, key])} />
              </div>;
            })}
          </div>
        </ScrollArea>
        {error && <p role="alert" className="px-3 py-1 text-xs text-destructive">{error}</p>}
        <div className="flex flex-wrap items-center gap-1 p-1.5">
          <Button variant="ghost" size="sm" disabled={!hidden.length} onClick={() => save([])}>Show all</Button>
          <Button variant="ghost" size="sm" disabled={!visible.length}
            onClick={() => save([...new Set([...hidden, ...models.map(chatModelKey)])])}>Hide all</Button>
          <Button variant="secondary" size="sm" className="ms-auto" onClick={() => changeMode(false)}>Done</Button>
        </div>
      </> : <>
        <Command shouldFilter={false}>
          <CommandInput ref={focusSwappedSearch} placeholder="Search models" value={filter} onValueChange={setFilter} />
          <CommandList className="max-h-72 p-1.5">
            <CommandEmpty>{models.length && !visible.length ? "All models are hidden" : "No matching models"}</CommandEmpty>
            {matches.map(option => <CommandItem key={chatModelKey(option)} value={chatModelKey(option)}
              className="min-h-10 gap-3 rounded-lg px-3" onSelect={() => {
                onSelect(option.provider, option.id);
                changeOpen(false);
              }}>
              <ModelDetails model={option} />
              {option.provider === model?.provider && option.id === model.id && <Check className="size-3.5" />}
            </CommandItem>)}
          </CommandList>
        </Command>
        <div className="p-1.5">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground"
            onClick={() => changeMode(true)}>Manage model visibility</Button>
        </div>
      </>}
    </PopoverContent>
  </Popover>;
}
