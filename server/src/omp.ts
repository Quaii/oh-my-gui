import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { RpcFrameDecoder } from './rpc-frames.ts';

export type RpcRecord = Record<string, any>;

export interface BridgeOptions {
  cwd: string;
  /** Extra CLI flags, e.g. --no-session, --profile, --model */
  args?: string[];
  ompBinary?: string;
  env?: Record<string, string>;
  mode?: 'rpc' | 'rpc-ui';
}

const localBinary = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "omp", "omp.exe");
const managedBinary = process.env.OMP_DESKTOP_DATA && path.join(process.env.OMP_DESKTOP_DATA, 'runtime', process.platform === 'win32' ? 'omp.exe' : 'omp');
const userBinaries = [managedBinary, process.platform === 'win32' ? localBinary : path.join(os.homedir(), '.local/bin/omp'), path.join(os.homedir(), '.bun/bin', process.platform === 'win32' ? 'omp.exe' : 'omp')];
export let OMP_BINARY = process.env.OMP_BIN || userBinaries.find((file): file is string => !!file && existsSync(file)) || 'omp';
export function selectOmpBinary(executable: string) { OMP_BINARY = executable; }

interface Pending {
  resolve: (v: any) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
  command: string;
}

/**
 * One OMP process speaking the RPC JSONL protocol on stdio.
 *
 * Emits:
 *   "record"  -> every stdout record (response / event / extension_ui_request)
 *   "event"   -> session events only (no responses)
 *   "ready"   -> the ready handshake
 *   "exit"    -> { code, signal }
 *   "stderr"  -> string
 */
export class OmpBridge extends EventEmitter {
  readonly key: string;
  readonly cwd: string;
  proc: ChildProcessWithoutNullStreams | null = null;
  ready: RpcRecord | null = null;
  sessionId: string | null = null;

  #buf: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  #seq = 0;
  #pending = new Map<string, Pending>();
  #killed = false;
  #stderr = "";
  #frames = new RpcFrameDecoder();
  protocolVersion = 1;
  protocolReady: Promise<void> = Promise.resolve();
  lastActivity = Date.now();

  constructor(key: string, cwd: string) {
    super();
    this.key = key;
    this.cwd = cwd;
    this.setMaxListeners(0);
  }

  get alive(): boolean {
    return !!this.proc && !this.proc.killed && this.proc.exitCode === null;
  }

  get stderrTail(): string {
    return this.#stderr.slice(-8000);
  }

  start(opts: BridgeOptions) {
    if (this.proc) throw new Error("already started");
    const args = ["--mode", opts.mode ?? "rpc", "--cwd", opts.cwd, ...(opts.args ?? [])];
    const bin = opts.ompBinary ?? OMP_BINARY;
    const proc = spawn(bin, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    this.proc = proc as ChildProcessWithoutNullStreams;

    proc.stdout.on("data", (chunk: Buffer) => this.#onData(chunk));
    proc.stderr.on("data", (chunk: Buffer) => {
      const s = chunk.toString("utf8");
      this.#stderr = (this.#stderr + s).slice(-64000);
      this.emit("stderr", s);
    });
    proc.on("error", (err) => {
      this.emit("event", { type: "bridge_error", message: String(err) });
    });
    proc.on("exit", (code, signal) => {
      for (const [, p] of this.#pending) {
        clearTimeout(p.timer);
        p.reject(new Error(`omp exited before responding to ${p.command}`));
      }
      this.#pending.clear();
      this.emit("exit", { code, signal });
    });
    return this;
  }

  /** Split strict JSONL on LF only. */
  #onData(chunk: Buffer<ArrayBufferLike>) {
    this.lastActivity = Date.now();
    this.#buf = this.#buf.length ? Buffer.concat([this.#buf, chunk]) : chunk;
    let nl: number;
    while ((nl = this.#buf.indexOf(0x0a)) !== -1) {
      let line = this.#buf.subarray(0, nl);
      this.#buf = this.#buf.subarray(nl + 1);
      if (line.length && line[line.length - 1] === 0x0d) line = line.subarray(0, line.length - 1);
      if (!line.length) continue;
      let rec: RpcRecord;
      try {
        if (line.length > 64 * 1024 * 1024) throw new Error('OMP exceeded the maximum transport frame size');
        rec = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(line));
        const decoded = this.#frames.accept(rec);
        if (!decoded) continue;
        rec = decoded;
      } catch (error: any) {
        this.#frames.reset();
        this.emit('event', { type: 'bridge_error', message: 'Invalid OMP frame: ' + error.message });
        for (const pending of this.#pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
        this.#pending.clear();
        continue;
      }
      this.#dispatch(rec);
    }
    if (this.#buf.length > 64 * 1024 * 1024) {
      this.#buf = Buffer.alloc(0);
      this.#frames.reset();
      const error = new Error('OMP exceeded the maximum transport frame size');
      this.emit('event', { type: 'bridge_error', message: error.message });
      for (const pending of this.#pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
      this.#pending.clear();
    }
  }

  #dispatch(rec: RpcRecord) {
    this.emit("record", rec);
    if (rec.type === "response") {
      const p = this.#pending.get(String(rec.id));
      if (p) {
        this.#pending.delete(String(rec.id));
        clearTimeout(p.timer);
        if (rec.success) p.resolve(rec.data ?? {});
        else p.reject(Object.assign(new Error(rec.error || `${rec.command} failed`), { code: rec.code }));
      }
      return;
    }
    if (rec.type === "ready") {
      this.ready = rec;
      if (rec.supportedProtocolVersions?.includes(2)) {
        this.protocolReady = this.send({ type: 'negotiate_protocol', protocolVersion: 2 }).then(result => {
          if (result.protocolVersion !== 2) throw new Error('OMP did not confirm protocol v2');
          this.protocolVersion = 2;
        }).catch(error => { this.emit('event', { type: 'notice', level: 'warning', message: 'Lossless transport unavailable: ' + error.message }); });
      }
      this.emit("ready", rec);
      return;
    }
    if (rec.type === "extension_ui_request") {
      this.emit("ui_request", rec);
      return;
    }
    this.emit("event", rec);
  }

  /** Send a command and wait for its response record. */
  send<T = any>(cmd: RpcRecord, timeoutMs = 120_000): Promise<T> {
    if (!this.proc || !this.proc.stdin.writable) {
      return Promise.reject(new Error("omp process is not running"));
    }
    const id = cmd.id ?? `c${++this.#seq}`;
    const payload = JSON.stringify({ ...cmd, id }) + "\n";
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`timeout: ${cmd.type}`));
      }, timeoutMs);
      this.#pending.set(id, { resolve, reject, timer, command: cmd.type });
      this.proc!.stdin.write(payload, (err) => {
        if (err) {
          this.#pending.delete(id);
          clearTimeout(timer);
          reject(err);
        }
      });
    });
  }

  /** Fire-and-forget write (used for extension_ui_response). */
  write(rec: RpcRecord) {
    if (!this.proc || !this.proc.stdin.writable) return;
    this.proc.stdin.write(JSON.stringify(rec) + "\n");
  }

  async stop(graceMs = 4000) {
    if (this.#killed) return;
    this.#killed = true;
    const proc = this.proc;
    if (!proc) return;
    try {
      proc.stdin.end();
    } catch {}
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch {}
        resolve();
      }, graceMs);
      proc.once("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  }
}
