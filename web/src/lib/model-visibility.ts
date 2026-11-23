export type ChatPickerModel = { provider: string; id: string; name?: string };

const storageKey = "ompfe.hidden-chat-models";

export function chatModelKey({ provider, id }: ChatPickerModel) {
  return JSON.stringify([provider, id]);
}

export function visibleChatModels<T extends ChatPickerModel>(models: T[], hidden: string[]) {
  if (!hidden.length) return models;
  const excluded = new Set(hidden);
  return models.filter(model => !excluded.has(chatModelKey(model)));
}

export function readHiddenChatModels(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(saved) ? saved.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

export function saveHiddenChatModels(hidden: string[]) {
  localStorage.setItem(storageKey, JSON.stringify(hidden));
}
