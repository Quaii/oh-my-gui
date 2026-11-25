import { randomUUID } from "node:crypto";

export type AgentNotification = "turn-complete" | "question";

export class AgentNotificationEvents {
  private turnNotified = false;

  accept(record: Record<string, unknown>): AgentNotification | undefined {
    if (record.type === "agent_start") this.turnNotified = false;
    if (
      record.type === "prompt_result" &&
      record.agentInvoked === true &&
      record.status === "completed" &&
      !this.turnNotified
    ) {
      this.turnNotified = true;
      return "turn-complete";
    }
    if (record.type === "extension_ui_request" && record.method === "ask" &&
      typeof record.id === "string" && record.id) {
      return "question";
    }
  }
}

function send(data: object) {
  process.stdout.write("OMP_DESKTOP_NOTIFICATION " + JSON.stringify(data) + "\n");
}

export function sendAgentNotification(kind: AgentNotification, backgroundChat: boolean) {
  send({ kind, backgroundChat });
}

type Status = {
  enabled: boolean;
  permission: "granted" | "prompt" | "denied" | "unavailable";
};
type Pending = {
  id: string;
  finish: (value: Status | Error) => void;
};
let pending: Pending | undefined;

export function desktopNotificationStatus(enabled?: boolean): Promise<Status> {
  if (pending) throw Error("A desktop notification request is already open.");
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const timer = setTimeout(() => pending?.finish(Error("The notification request timed out.")), enabled ? 120_000 : 5_000);
    pending = {
      id,
      finish(value) {
        pending = undefined;
        clearTimeout(timer);
        if (value instanceof Error) reject(value);
        else resolve(value);
      },
    };
    send({ id, enabled });
  });
}

export function receiveDesktopNotification(value: Status & { id: string; error?: string }) {
  if (pending?.id === value.id) {
    pending.finish(value.error ? Error(value.error) : { enabled: value.enabled, permission: value.permission });
  }
}
