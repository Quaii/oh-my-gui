const dnsLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function isProviderWebsiteHost(value: string) {
  const labels = value.split(".");
  const suffix = labels.at(-1) ?? "";
  return value.length <= 253 && labels.length > 1 && labels.every(label => dnsLabel.test(label)) &&
    /^[a-z][a-z0-9-]+$/.test(suffix) && !["localhost", "local", "internal", "lan", "test", "invalid", "example", "onion"].includes(suffix);
}

export function providerWebsiteHost(endpoint?: string) {
  if (!endpoint) return undefined;
  try {
    const url = new URL(endpoint);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return undefined;
    const hostname = url.hostname.replace(/\.$/, "");
    if (!isProviderWebsiteHost(hostname)) return undefined;
    const site = hostname.replace(/^(?:api(?:-[a-z0-9-]+)?|inference|models|gateway)\./, "");
    return isProviderWebsiteHost(site) ? site : hostname;
  } catch {
    return undefined;
  }
}
