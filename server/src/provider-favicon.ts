import { lookup } from "node:dns";
import { request } from "node:https";
import { BlockList } from "node:net";
import { isProviderWebsiteHost } from "../../shared/provider-website.ts";

const nonPublic = new BlockList();
for (const [subnet, bits] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 3],
] as const) nonPublic.addSubnet(subnet, bits, "ipv4");
for (const [subnet, bits] of [
  ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20],
] as const) nonPublic.addSubnet(subnet, bits, "ipv6");
const globalUnicast = new BlockList();
globalUnicast.addSubnet("2000::", 3, "ipv6");

export function publicFaviconAddress(address: string, family: number) {
  if (family === 4) return !nonPublic.check(address, "ipv4");
  return family === 6 && globalUnicast.check(address, "ipv6") && !nonPublic.check(address, "ipv6");
}

function eligible(url: URL) {
  return url.protocol === "https:" && !url.port && !url.username && !url.password && isProviderWebsiteHost(url.hostname);
}

export function declaredFavicons(html: string, page: URL) {
  const head = html.split(/<\/head\s*>/i, 1)[0]
    .replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const icons: string[] = [];
  const touch: string[] = [];
  for (const [tag] of head.matchAll(/<link\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)) {
    const attributes = new Map<string, string>();
    for (const [, name, double, single, bare] of tag.matchAll(/([^\s=<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/g)) {
      if (!attributes.has(name.toLowerCase())) attributes.set(name.toLowerCase(), double ?? single ?? bare);
    }
    const rel = (attributes.get("rel") ?? "").toLowerCase().split(/\s+/);
    const href = attributes.get("href");
    if (!href || (!rel.includes("icon") && !rel.includes("apple-touch-icon"))) continue;
    try {
      const url = new URL(href.replace(/&amp;/gi, "&"), page);
      if (!eligible(url)) continue;
      url.hash = "";
      (rel.includes("icon") ? icons : touch).push(url.href);
    } catch {
      // Skip invalid icon URLs.
    }
  }
  return [...new Set([...icons, ...touch])];
}

const maxImageBytes = 256 * 1024;
const maxHeadBytes = 256 * 1024;
const imageTypes = new Set([
  "image/png", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon",
  "image/ico", "image/jpeg", "image/gif", "image/webp", "image/avif",
]);
type Image = { bytes: Buffer; type: string };
type Response = { url: URL; type: string; bytes: Buffer };

function load(url: URL, kind: "html" | "image", signal: AbortSignal, redirects = 3): Promise<Response> {
  if (!eligible(url)) return Promise.reject(Error("Invalid provider website."));
  return new Promise((resolve, reject) => {
    const req = request(url, {
      signal,
      agent: false,
      headers: { accept: kind === "html" ? "text/html" : "image/*", "user-agent": "omp. (provider favicon)" },
      // Connect using the vetted address from this lookup, including on redirects.
      lookup(hostname, options, callback) {
        lookup(hostname, { all: true }, (error, addresses) => {
          const allowed = error ? [] : addresses.filter(({ address, family }) => publicFaviconAddress(address, family));
          const address = allowed[0];
          if (!address) return callback(error || Error("No public address."), "", 4);
          callback(null, options.all ? allowed : address.address, address.family);
        });
      },
    }, response => {
      const status = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(status) && redirects > 0 && response.headers.location) {
        response.destroy();
        try { resolve(load(new URL(response.headers.location, url), kind, signal, redirects - 1)); }
        catch (error) { reject(error); }
        return;
      }
      const type = (response.headers["content-type"] ?? "").split(";", 1)[0].trim().toLowerCase();
      if (status !== 200 || (kind === "html" ? type !== "text/html" : !imageTypes.has(type))) {
        response.destroy();
        reject(Error("No compatible favicon content."));
        return;
      }
      void (async () => {
        const chunks: Buffer[] = [];
        let size = 0;
        const max = kind === "html" ? maxHeadBytes : maxImageBytes;
        for await (const chunk of response as AsyncIterable<Buffer>) {
          const remaining = max - size;
          if (kind === "image" && chunk.length > remaining) throw Error("Favicon is too large.");
          chunks.push(chunk.subarray(0, remaining));
          size += Math.min(chunk.length, remaining);
          if (kind === "html" && size >= max) break;
        }
        return { url, type, bytes: Buffer.concat(chunks, size) };
      })().then(resolve, reject);
    });
    req.on("error", reject);
    req.end();
  });
}

async function fetchFavicon(host: string): Promise<Image | undefined> {
  const site = new URL(`https://${host}/`);
  const deadline = AbortSignal.timeout(8000);
  const signal = () => AbortSignal.any([deadline, AbortSignal.timeout(3000)]);
  const homepage = await load(site, "html", signal()).catch(() => undefined);
  const page = homepage?.url ?? site;
  const icons = homepage ? declaredFavicons(homepage.bytes.toString("utf8"), page).slice(0, 4) : [];
  icons.push(new URL("/favicon.ico", page).href, new URL("/apple-touch-icon.png", page).href);
  for (const href of new Set(icons)) {
    if (deadline.aborted) break;
    const image = await load(new URL(href), "image", signal()).catch(() => undefined);
    if (image?.bytes.length) return image;
  }
}

const cache = new Map<string, { expires: number; image: Promise<Image | undefined> }>();

export function providerFavicon(host: string) {
  if (!isProviderWebsiteHost(host)) return Promise.resolve(undefined);
  const previous = cache.get(host);
  if (previous && previous.expires > Date.now()) return previous.image;
  if (cache.size >= 64) cache.delete(cache.keys().next().value!);
  const entry = { expires: Date.now() + 60_000, image: fetchFavicon(host) };
  cache.set(host, entry);
  void entry.image.then(image => { entry.expires = Date.now() + (image ? 12 * 60 * 60_000 : 15 * 60_000); });
  return entry.image;
}
