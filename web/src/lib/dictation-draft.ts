/** The stop response and terminal event describe the same text. Consume once. */
export type DraftCapture = { id: string; owner: string; consumed: boolean };
export function consumeDictation(
  capture: DraftCapture,
  event: { captureId?: string; text?: string; error?: string },
) {
  if (capture.consumed || event.captureId !== capture.id) return null;
  capture.consumed = true;
  return event.error || typeof event.text !== "string" ? null : event.text;
}
export function appendDictation(draft: string, text: string) {
  return text ? draft + (draft && !/\s$/.test(draft) ? " " : "") + text : draft;
}
