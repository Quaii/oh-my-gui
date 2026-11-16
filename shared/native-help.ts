export type NativeFlag = {
  name: string;
  description: string;
  value: boolean;
  repeatable: boolean;
  required: boolean;
  choices: string[];
};
export type NativeHelp = {
  description: string;
  usage: string;
  arguments: {
    name: string;
    description: string;
    required: boolean;
    multiple: boolean;
    choices: string[];
  }[];
  flags: NativeFlag[];
  commands: { name: string; description: string }[];
  text: string;
};

/** OMP publishes its installed command tree through oclif help. Never execute help text. */
export function parseNativeHelp(text: string): NativeHelp {
  text = text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/\r/g, "");
  const sections = new Map<string, string[]>();
  let section = "";
  for (const line of text.split("\n")) {
    if (/^[A-Z][A-Z ]+$/.test(line.trim()) && !/^\s/.test(line)) {
      section = line.trim();
      sections.set(section, []);
    } else if (/^\S.*:\s*$/.test(line)) section = "";
    else if (section) sections.get(section)!.push(line);
  }
  const commands: NativeHelp["commands"] = [];
  for (const line of sections.get("COMMANDS") ?? []) {
    const match = line.match(/^\s{2}(\S+)\s{2,}(.+)$/);
    if (match && /^[a-z][a-z0-9:-]*$/.test(match[1]))
      commands.push({ name: match[1], description: match[2] });
  }
  const flags: NativeFlag[] = [];
  for (const line of sections.get("FLAGS") ?? []) {
    const match = line.match(/^\s+(?:-\w,\s*)?(--[\w-]+)([^ ]*)\s{2,}(.+)$/);
    if (!match) continue;
    const description = match[3];
    const choice = description.match(
      /\[(?:options?|choices?):\s*([^\]]+)\]/i,
    )?.[1];
    flags.push({
      name: match[1],
      description,
      value: /[=<[]/.test(match[2]),
      repeatable: /repeatable|multiple times|can be used multiple/.test(
        description,
      ),
      required: /\(required\)|\[required\]/i.test(description),
      choices: choice
        ? choice
            .split(/[,|]/)
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
    });
  }
  const args: NativeHelp["arguments"] = [];
  for (const line of sections.get("ARGUMENTS") ?? []) {
    const match = line.match(/^\s{2}(\S+)\s{2,}(.+)$/);
    if (match)
      args.push({
        name: match[1],
        description: match[2],
        required: /\[required\]|\(required\)/i.test(match[2]),
        multiple:
          /^(TARGETS|ARGS|IDS|FILES|MESSAGES)$/.test(match[1]) ||
          /\.\.\.|multiple|files/i.test(match[2]),
        choices:
          match[2].match(/\(([\w-]+(?:\|[\w-]+)+)\)/)?.[1].split("|") ?? [],
      });
  }
  return {
    description:
      text
        .split("\n")
        .find((line) => line.trim() && !line.startsWith("omp"))
        ?.trim() ?? "",
    usage: (sections.get("USAGE") ?? []).join("\n").trim(),
    arguments: args,
    flags,
    commands,
    text,
  };
}

export function nativeArguments(
  help: NativeHelp,
  values: Record<string, unknown>,
  positionals: string[],
) {
  if (
    !Array.isArray(positionals) ||
    positionals.some(
      (value) => typeof value !== "string" || value.includes("\0"),
    )
  )
    throw Error("Invalid command arguments");
  const known = new Map(help.flags.map((flag) => [flag.name, flag]));
  const args: string[] = [];
  for (const [name, value] of Object.entries(values)) {
    const flag = known.get(name);
    if (!flag) throw Error("This OMP version does not advertise " + name);
    if (/api-key|token|password|secret/i.test(name))
      throw Error("Use the native terminal workflow for credential arguments.");
    if (!flag.value) {
      if (value === true) args.push(name);
      else if (value !== false && value !== "")
        throw Error(name + " is a checkbox");
      continue;
    }
    const entries = flag.repeatable && Array.isArray(value) ? value : [value];
    for (const entry of entries) {
      if (typeof entry !== "string" || entry.includes("\0"))
        throw Error("Invalid value for " + name);
      if (!entry && !flag.required) continue;
      if (flag.choices.length && !flag.choices.includes(entry))
        throw Error("Choose an advertised value for " + name);
      args.push(name + "=" + entry);
    }
  }
  for (const flag of help.flags)
    if (
      flag.required &&
      !args.some((arg) => arg === flag.name || arg.startsWith(flag.name + "="))
    )
      throw Error(flag.name + " is required");
  // Keep argument values from being interpreted as a second flag or command option.
  if (positionals.length) args.push("--", ...positionals);
  return args;
}

export function needsNativeTerminal(path: string[]) {
  if (path[0] === "skill" && path.includes("token")) return true;
  return [
    "auth",
    "auth-broker",
    "auth-gateway",
    "token",
    "login",
    "config",
    "acp",
    "bash",
    "sh",
    "zsh",
    "shell",
    "git",
    "gallery",
    "render",
    "play",
    "predict",
    "completions",
    "join",
    "stream",
    "serve",
    "share",
    "clip",
  ].includes(path[0]);
}
export function powershellLiteral(value: string) {
  return "'" + value.replace(/'/g, "''") + "'";
}
export function posixLiteral(value: string) {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}
