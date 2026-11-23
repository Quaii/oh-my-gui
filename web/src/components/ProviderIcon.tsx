import { useState } from "react";
import { Globe2, Server } from "lucide-react";
import assets from "@/lib/provider-assets.json";
import { providerWebsiteHost } from "../../../shared/provider-website";

type Asset = { src?: string; favicon?: string; mono?: boolean };

export function ProviderIcon({ provider, website, className = "size-4" }: {
  provider: string;
  website?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const id = provider.toLowerCase();
  const catalog = assets as Record<string, Asset>;
  const brand = /openai|codex/.test(id) ? "openai" : /anthropic|claude/.test(id) ? "anthropic" : /google|gemini|vertex/.test(id) ? "google" : id;
  const asset = catalog[id] || catalog[brand];
  const host = providerWebsiteHost(website);
  const discovered = host && `/api/provider-favicon?host=${encodeURIComponent(host)}`;
  const candidates = [discovered, asset?.src, asset?.favicon];
  const src = candidates.find((candidate): candidate is string => !!candidate && !failed.has(candidate));
  if (src) return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer"
    data-mono={!!asset?.mono && src === asset.src}
    className={`provider-mark shrink-0 rounded-sm object-contain ${className}`}
    onError={() => setFailed(previous => new Set([...previous, src]))} />;

  const Icon = /local|llama|vllm|studio/.test(id) ? Server : Globe2;
  return <Icon aria-hidden="true" className={`shrink-0 text-muted-foreground ${className}`} />;
}
