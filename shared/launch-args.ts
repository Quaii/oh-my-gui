/** Parse an argv list, never a shell program. Backslashes in Windows paths stay literal. */
export function parseLaunchArgs(text: string): string[] {
  const args: string[] = [];
  let word = "",
    quote = "",
    started = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (
      char === "\\" &&
      quote !== "'" &&
      i + 1 < text.length &&
      (text[i + 1] === quote ||
        (quote === '"' && text[i + 1] === "\\") ||
        (!quote && /[\s"']/.test(text[i + 1])))
    ) {
      word += text[++i];
      started = true;
    } else if (quote) {
      if (char === quote) quote = "";
      else word += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) args.push(word);
      word = "";
      started = false;
    } else {
      word += char;
      started = true;
    }
  }
  if (quote) throw new Error("Close the quoted launch argument before saving.");
  if (started) args.push(word);
  return args;
}

export function formatLaunchArgs(args: string[]) {
  return args
    .map((arg) =>
      !arg || /[\s"']/.test(arg)
        ? '"' + arg.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'
        : arg,
    )
    .join(" ");
}

export function validateGuiLaunchArgs(args: string[]) {
  if (
    !Array.isArray(args) ||
    args.some((arg) => typeof arg !== "string" || arg.includes("\0"))
  )
    throw new Error("Launch flags must be text arguments.");
  const incompatible = new Set([
    "--mode",
    "--cwd",
    "--print",
    "-p",
    "--alias",
    "--goal",
    "--export",
    "--help",
    "-h",
    "--version",
    "--wait-async",
    "--from-claude",
    "--from-codex",
    "--continue",
    "-c",
    "--resume",
    "-r",
    "--restore",
  ]);
  for (const arg of args) {
    const flag = arg.split("=")[0];
    if (incompatible.has(flag))
      throw new Error(
        `${flag} needs a native CLI workflow or the session controls; it cannot override the GUI bridge.`,
      );
    if (flag === "--api-key")
      throw new Error(
        "Use provider settings for API keys. Launch flags are saved in browser storage.",
      );
  }
  return args;
}
