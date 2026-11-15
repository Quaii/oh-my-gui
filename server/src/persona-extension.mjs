// OMP's native before_agent_start hook preserves tools and project context.
export function composePersona(systemPrompt, persona) {
  const transform = text => persona.stripIdentity ? text.replace(/^You are omp's trusted coding assistant\.\r?\n?/m, "") : text;
  const prefix = `<persona name=${JSON.stringify(persona.name)}>\n${persona.prompt}\n</persona>`;
  const blocks = Array.isArray(systemPrompt) ? systemPrompt.map(block => typeof block === "string" ? transform(block) : block) : [transform(String(systemPrompt ?? ""))];
  return persona.placement === "append" ? [...blocks, prefix] : [prefix, ...blocks];
}
export default function (pi) {
  let launch = process.env.OMP_WEB_PERSONA ? JSON.parse(process.env.OMP_WEB_PERSONA) : null;
  let active = null;
  const restore = (_event, ctx) => {
    const saved = ctx.sessionManager.getBranch().filter(entry => entry.type === "custom" && entry.customType === "omp.web.persona").at(-1);
    active = saved?.data ?? null;
  };
  for (const event of ["session_start", "session_branch", "session_tree"]) pi.on(event, restore);
  pi.on("before_agent_start", (event, ctx) => {
    if (event.reason === "revive") return;
    if (!active && launch && !ctx.sessionManager.getBranch().some(entry => entry.type === "message")) {
      active = launch; launch = null;
      pi.appendEntry("omp.web.persona", active);
    }
    if (active) return { systemPrompt: composePersona(event.systemPrompt, active) };
  });
}
