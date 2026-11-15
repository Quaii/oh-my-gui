import { spawn } from "node:child_process";

import { OMP_BINARY as OMP_BIN } from "./omp.ts";

/**
 * Run one slash command (e.g. "/mcp list") in a throwaway RPC session and
 * collect its `command_output` text. Slash commands handled by the runtime
 * never reach the model, so this is cheap and does not disturb live sessions.
 */
export function runSlash(cwd: string, command: string, opts: { waitMs?: number; args?: string[] } = {}): Promise<{ lines: string[]; stderr: string; timedOut: boolean }> {
  const waitMs = Math.min(Math.max(opts.waitMs ?? 9000, 1500), 60000);
  return new Promise((resolve) => {
    const child = spawn(OMP_BIN, ["--mode", "rpc", "--cwd", cwd, ...(opts.args ?? [])], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    const lines: string[] = [];
    let stderr = "";
    let buf = "";
    let sent = false;
    let settled = false;
    let timedOut = false;

    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      try {
        child.kill();
      } catch {}
      resolve({ lines, stderr: stderr.slice(-4000), timedOut });
    };

    const deadline = setTimeout(() => {
      timedOut = true;
      done();
    }, waitMs + 6000);

    child.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (e: any) => {
      stderr += String(e?.message ?? e);
      done();
    });
    child.on("exit", () => done());

    child.stdout?.on("data", (d) => {
      buf += d.toString();
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let rec: any;
        try {
          rec = JSON.parse(line);
        } catch {
          continue;
        }
        if (rec.type === "ready" && !sent) {
          sent = true;
          child.stdin?.write(JSON.stringify({ id: "slash", type: "prompt", message: command }) + "\n");
          setTimeout(done, waitMs);
          continue;
        }
        if (rec.type === "command_output" && typeof rec.text === "string") lines.push(rec.text);
        if (rec.type === "response" && rec.id === "slash" && rec.success === false) {
          lines.push("error: " + JSON.stringify(rec.error));
          done();
        }
      }
    });
  });
}

