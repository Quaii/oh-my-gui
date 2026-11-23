type Rates = { input?: number; output?: number; cacheRead?: number; cacheWrite?: number };
type ProviderCatalog = Record<string, { models?: Record<string, {
  cost?: { input?: number; output?: number; cache_read?: number; cache_write?: number };
}> }>;
type RouterCatalog = { data: Array<{ id: string; pricing?: {
  prompt?: string; completion?: string; input_cache_read?: string; input_cache_write?: string;
} }> };
type ModelUsage = {
  provider: string;
  model: string;
  totalCost?: number | null;
  totalInputTokens?: number | null;
  totalOutputTokens?: number | null;
  totalCacheReadTokens?: number | null;
  totalCacheWriteTokens?: number | null;
};

function rate(value: unknown, multiplier = 1) {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return undefined;
  const number = Number(value) * multiplier;
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function estimate(usage: ModelUsage, rates: Rates) {
  const buckets = [
    [usage.totalInputTokens, rates.input],
    [usage.totalOutputTokens, rates.output],
    [usage.totalCacheReadTokens, rates.cacheRead],
    [usage.totalCacheWriteTokens, rates.cacheWrite],
  ] as const;
  if (!buckets.some(([tokens]) => (tokens ?? 0) > 0)) return null;
  let total = 0;
  for (const [tokens, price] of buckets) {
    if (!tokens) continue;
    if (price === undefined || !Number.isFinite(tokens) || tokens < 0) return null;
    total += tokens * price / 1_000_000;
  }
  return total;
}

export function compareUsagePricing(usage: ModelUsage[], providers?: ProviderCatalog, router?: RouterCatalog) {
  const routerModels = new Map(router?.data.map(model => [model.id, model.pricing]));
  return usage.map(row => {
    const provider = row.provider === "openai-codex" ? "openai" : row.provider;
    const direct = providers?.[provider]?.models?.[row.model]?.cost;
    const routerId = row.model.includes("/") ? row.model : `${provider}/${row.model}`;
    const routed = routerModels.get(routerId);
    const result = { model: row.model, provider: row.provider, recorded: row.totalCost ?? null };
    if (direct) {
      const reference = estimate(row, { input: rate(direct.input), output: rate(direct.output),
        cacheRead: rate(direct.cache_read), cacheWrite: rate(direct.cache_write) });
      if (reference !== null) return { ...result, reference, source: "Models.dev", catalogId: `${provider}/${row.model}` };
    }
    if (routed) {
      const reference = estimate(row, { input: rate(routed.prompt, 1e6), output: rate(routed.completion, 1e6),
        cacheRead: rate(routed.input_cache_read, 1e6), cacheWrite: rate(routed.input_cache_write, 1e6) });
      if (reference !== null) return { ...result, reference, source: "OpenRouter", catalogId: routerId };
    }
    return { ...result, reference: null, source: null, catalogId: null };
  });
}

function cachedCatalog<T>(url: string, parse: (body: unknown) => T) {
  let current: { expires: number; promise: Promise<T> } | undefined;
  return () => {
    if (current && current.expires > Date.now()) return current.promise;
    const promise = fetch(url, { signal: AbortSignal.timeout(8_000), redirect: "error" })
      .then(response => {
        if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
        return response.json();
      }).then(parse).catch(error => {
        current = undefined;
        throw error;
      });
    current = { expires: Date.now() + 3_600_000, promise };
    return promise;
  };
}

const providersCatalog = cachedCatalog("https://models.dev/api.json", body => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid Models.dev catalog");
  return body as ProviderCatalog;
});
const routerCatalog = cachedCatalog("https://openrouter.ai/api/v1/models", body => {
  if (!Array.isArray((body as RouterCatalog | null)?.data)) throw new Error("Invalid OpenRouter catalog");
  return body as RouterCatalog;
});

export async function usagePricing(usage: ModelUsage[]) {
  const [providers, router] = await Promise.allSettled([providersCatalog(), routerCatalog()]);
  if (providers.status === "rejected" && router.status === "rejected") {
    throw new Error("Pricing catalogs are unavailable. Try again later.");
  }
  return {
    rows: compareUsagePricing(usage,
      providers.status === "fulfilled" ? providers.value : undefined,
      router.status === "fulfilled" ? router.value : undefined),
    unavailable: [
      ...(providers.status === "rejected" ? ["Models.dev"] : []),
      ...(router.status === "rejected" ? ["OpenRouter"] : []),
    ],
  };
}
