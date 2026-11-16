type RecordValue = Record<string, any>;
type HostHandler = (
  request: RecordValue,
  signal: AbortSignal,
  update: (value: RecordValue) => void,
) => Promise<RecordValue>;
/** One owner for bidirectional host requests, including cancellation and errors. */
export class HostRpcAdapter {
  private pending = new Map<string, AbortController>();
  private tools = new Map<string, HostHandler>();
  private schemes = new Map<string, HostHandler>();
  private write: (record: RecordValue) => void;
  constructor(write: (record: RecordValue) => void) {
    this.write = write;
  }
  tool(name: string, handler: HostHandler) {
    this.tools.set(name, handler);
  }
  uri(scheme: string, handler: HostHandler) {
    this.schemes.set(scheme, handler);
  }
  async accept(record: RecordValue) {
    if (
      record.type === "host_tool_cancel" ||
      record.type === "host_uri_cancel"
    ) {
      this.pending.get(record.targetId)?.abort();
      return true;
    }
    const uri = record.type === "host_uri_request";
    if (!uri && record.type !== "host_tool_call") return false;
    const controller = new AbortController();
    this.pending.set(record.id, controller);
    try {
      const handler = uri
        ? this.schemes.get(new URL(record.url).protocol.slice(0, -1))
        : this.tools.get(record.toolName);
      if (!handler)
        throw Error(
          "This GUI has no adapter for " + (uri ? record.url : record.toolName),
        );
      const result = await handler(
        record,
        controller.signal,
        (partialResult) => {
          if (!uri && !controller.signal.aborted)
            this.write({
              type: "host_tool_update",
              id: record.id,
              partialResult,
            });
        },
      );
      if (!controller.signal.aborted)
        this.write(
          uri
            ? { type: "host_uri_result", id: record.id, ...result }
            : { type: "host_tool_result", id: record.id, result },
        );
    } catch (error: any) {
      if (!controller.signal.aborted)
        this.write(
          uri
            ? {
                type: "host_uri_result",
                id: record.id,
                content: error.message,
                isError: true,
              }
            : {
                type: "host_tool_result",
                id: record.id,
                isError: true,
                result: { content: [{ type: "text", text: error.message }] },
              },
        );
    } finally {
      this.pending.delete(record.id);
    }
    return true;
  }
  dispose() {
    for (const controller of this.pending.values()) controller.abort();
    this.pending.clear();
  }
}
export const GUI_HOST_TOOLS = [
  {
    name: "ui_notice",
    label: "Notify GUI",
    description:
      "Queue a notice in the connected omp. interface. Does not read files or execute code.",
    parameters: {
      type: "object",
      properties: { message: { type: "string", maxLength: 10000 } },
      required: ["message"],
      additionalProperties: false,
    },
    loadMode: "discoverable",
  },
];
export const GUI_HOST_SCHEMES = [
  {
    scheme: "omp-ui",
    description:
      "Read omp-ui://runtime for the last runtime state reported to this GUI.",
    writable: false,
    immutable: false,
  },
];
