import { SettingGlyph } from "./SettingsNavigation";
import { useEffect, useState } from "react";
import type { Setting } from "../../lib/settings";
import { labelOf, prettyKey } from "../../lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, RotateCcw } from "lucide-react";

export function Toggle({
  value,
  onChange,
  disabled,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Switch
      checked={value}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={label ?? (value ? "enabled" : "disabled")}
    />
  );
}

export function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v)}
      variant="outline"
      size="sm"
      className="flex-wrap justify-end"
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} className="px-2 text-[11.5px]">
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function enumOptions(s: Setting) {
  if (s.ui?.options?.length) return s.ui.options;
  const values = s.ui?.values ?? [];
  return values.map((v) => ({ value: v, label: v }));
}

/** One config key rendered with the right control for its type. */
export function SettingRow({
  setting,
  onSave,
  onReset,
}: {
  setting: Setting;
  onSave: (value: unknown) => void;
  onReset: () => void;
  compact?: boolean;
}) {
  const [text, setText] = useState(() => toText(setting.value));
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setText(toText(setting.value));
    setErr(null);
  }, [setting.value, setting.key]);

  const commitText = () => {
    const raw = text.trim();
    try {
      if (setting.type === "number") {
        if (raw === "") return setErr(null);
        const n = Number(raw);
        if (!Number.isFinite(n)) throw new Error("not a number");
        if (n !== setting.value) onSave(n);
      } else if (setting.type === "array" || setting.type === "record" || setting.type === "object") {
        const parsed = raw === "" ? (setting.type === "array" ? [] : {}) : JSON.parse(raw);
        onSave(parsed);
      } else if (raw !== String(setting.value ?? "")) {
        onSave(raw);
      }
      setErr(null);
      setOpen(false);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  };

  const label = labelOf(setting);
  const desc = setting.ui?.description ?? setting.description;
  const complex =
    setting.type === "array" || setting.type === "record" || setting.type === "object";

  return (
    <div className="setting-row">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5"><SettingGlyph settingKey={setting.key} type={setting.type}/>
          <Label className="text-[14px] font-medium text-foreground" title={setting.key}>{label}</Label>
          {setting.explicit && (
            <span className="size-1.5 rounded-full bg-primary" title="set explicitly in config.yml" />
          )}
        </div>
        {desc && <div className="mt-1 ml-[26px] max-w-[60ch] text-[13px] leading-relaxed text-muted-foreground">{desc}</div>}
      </div>

      <div className="setting-control flex min-w-0 flex-wrap items-center gap-2">
        {setting.type === "boolean" ? (
          <Toggle value={!!setting.value} onChange={onSave} label={label} />
        ) : setting.type === "enum" ? (
          enumOptions(setting).length <= 3 ? (
            <Segmented value={String(setting.value ?? "")} options={enumOptions(setting)} onChange={onSave} />
          ) : (
            <Select value={String(setting.value ?? "")} onValueChange={onSave}>
              <SelectTrigger size="sm" className="min-w-[130px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {enumOptions(setting).map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-[12px]">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        ) : complex ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 text-[11.5px] font-normal">
                {summaryOf(setting.value)}
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={Math.min(12, Math.max(3, text.split("\n").length + 1))}
                spellCheck={false}
                className="resize-y font-mono text-[11.5px] leading-relaxed"
              />
              <div className="mt-1.5 flex items-center gap-2">
                <Button size="sm" onClick={commitText} className="h-7 text-[11px]">
                  apply
                </Button>
                {err && <span className="truncate text-[10.5px] text-destructive">{err}</span>}
              </div>
            </PopoverContent>
          </Popover>
        ) : setting.type === "number" ? (
          <Input
            type="number"
            aria-label={label}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => e.key === "Enter" && commitText()}
            className="h-9 w-24 max-w-full text-[13px]"
          />
        ) : (
          <Input
            aria-label={label}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => e.key === "Enter" && commitText()}
            className="h-9 w-56 max-w-full text-[13px]"
          />
        )}
        {setting.explicit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            title="reset to default"
            aria-label={`Reset ${label} to default`}
            className="setting-reset size-6 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function summaryOf(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (value && typeof value === "object")
    return `${Object.keys(value).length} key${Object.keys(value).length === 1 ? "" : "s"}`;
  return "edit";
}

export function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="settings-group mb-7">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h3>
        {hint && <span className="font-mono text-[10px] text-muted-foreground/70">{hint}</span>}
      </div>
      <div className="settings-group-body rounded-xl border border-border/60 bg-card/50 px-4">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-[12px] text-muted-foreground">
      {children}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  tone = "default",
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
  title?: string;
}) {
  return (
    <Button
      variant={tone === "primary" ? "default" : tone === "danger" ? "destructive" : "outline"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-8 gap-1.5 text-[12px] font-normal"
    >
      {children}
    </Button>
  );
}
