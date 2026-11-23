/** Keep pending native questions and bounded transient output across SSE attachment. */
export class UiReplay {
  readonly dialogs = new Map<string, Record<string, any>>();
  private events: { record: Record<string, any>; bytes: number }[] = [];
  private bytes = 0;
  private sequence = 0;

  accept(input: Record<string, any>) {
    const record: Record<string, any> = {
      ...input,
      uiEventId: `view-${++this.sequence}`,
      uiReceivedAt: Date.now(),
    };
    if (record.type === 'provider_login_finished') {
      this.events = this.events.filter(event => {
        const finished = event.record.method === 'open_url' && event.record.authProvider === record.providerId;
        if (finished) this.bytes -= event.bytes;
        return !finished;
      });
      for (const [id, dialog] of this.dialogs) {
        if (dialog.authProvider === record.providerId) this.dialogs.delete(id);
      }
    }
    if (record.type === "extension_ui_request") {
      if (record.method === "cancel") this.dialogs.delete(record.targetId);
      else if (
        ["select", "confirm", "input", "editor", "ask"].includes(record.method)
      )
        this.dialogs.set(record.id, record);
    }
    if (
      ["command_output", "notice", "extension_error", "bridge_error"].includes(
        record.type,
      ) ||
      (record.type === "extension_ui_request" &&
        ["set_editor_text", "setWidget", "setStatus", "open_url"].includes(
          record.method,
        ))
    ) {
      if (record.type === "extension_ui_request") {
        const property =
          record.method === "setWidget"
            ? "widgetKey"
            : record.method === "setStatus"
              ? "statusKey"
              : record.method === "open_url" ? "authProvider" : "method";
        this.events = this.events.filter((event) => {
          const obsolete =
            event.record.method === record.method &&
            event.record[property] === record[property];
          if (obsolete) this.bytes -= event.bytes;
          return !obsolete;
        });
      }
      const bytes = Buffer.byteLength(JSON.stringify(record));
      this.events.push({ record, bytes });
      this.bytes += bytes;
      while (
        this.events.length > 1 &&
        (this.events.length > 64 || this.bytes > 4 * 1024 * 1024)
      ) {
        this.bytes -= this.events.shift()!.bytes;
      }
    }
    return record;
  }

  snapshot() {
    return [
      ...this.events.map((event) => event.record),
      ...this.dialogs.values(),
    ];
  }
}
