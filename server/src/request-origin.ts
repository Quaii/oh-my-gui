/** Browser-originated native/API actions must come from the same loopback host. */
export function loopbackApiRequest(
  host: string | undefined,
  origin: string | undefined,
) {
  if (!host) return false;
  if (/[\\/?#@]/.test(host)) return false;
  try {
    const target = new URL("http://" + host);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname))
      return false;
    if (!origin) return true; // Local CLI and the desktop backend use their own authentication.
    const source = new URL(origin);
    return (
      ["http:", "https:"].includes(source.protocol) &&
      source.host === target.host
    );
  } catch {
    return false;
  }
}
