import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatModelKey, visibleChatModels, type ChatPickerModel } from "@/lib/model-visibility";
import { ProviderIcon } from "../ProviderIcon";
import { Empty, Toggle } from "./Controls";
import { Notice } from "./ManagementShared";
import { SettingsHeading } from "./SettingsHeading";

export function ChatModelVisibility({ models, hidden, onChange }: {
  models: ChatPickerModel[];
  hidden: string[];
  onChange: (hidden: string[]) => void;
}) {
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const query = filter.trim().toLowerCase();
  const excluded = new Set(hidden);
  const filtered = models.filter(model => `${model.name ?? ""} ${model.provider}/${model.id}`.toLowerCase().includes(query));

  function save(next: string[]) {
    try {
      onChange(next);
      setError("");
    } catch {
      setError("Could not save model visibility on this device.");
    }
  }

  return (
    <section className="settings-card-stack">
      <SettingsHeading title="Chat model selector" description="Show or hide models in the chat picker." />
      <div className="flex flex-wrap items-center gap-2">
        <Input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Filter models" aria-label="Filter chat models" className="w-56 max-w-full"/>
        <Button variant="ghost" size="sm" disabled={!hidden.length} onClick={() => save([])}>Show all models</Button>
        {models.length > 0 && <span className="ml-auto text-xs text-muted-foreground">{visibleChatModels(models, hidden).length} of {models.length} shown</span>}
      </div>
      <Notice error={error}/>
      {filtered.length === 0 ? (
        <Empty>{models.length ? "No models match your filter." : "No models available."}</Empty>
      ) : (
        <div className="settings-card settings-card-list">
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {filtered.map(model => {
              const key = chatModelKey(model);
              const name = model.name || model.id;
              return (
                <div key={key} className="flex items-center gap-3 py-2.5 pr-2">
                  <ProviderIcon provider={model.provider}/>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{name}</div>
                    <div className="truncate text-xs text-muted-foreground">{model.provider} · {model.id}</div>
                  </div>
                  <Toggle label={`Show ${name} (${model.provider}) in chat`} value={!excluded.has(key)}
                    onChange={shown => save(shown ? hidden.filter(id => id !== key) : [...hidden, key])}/>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
