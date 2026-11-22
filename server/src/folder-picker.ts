import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";

// Human-directed directory browsing only; never reads file contents or changes project membership.
export async function projectFolders(requested?: string) {
  const directory = requested?.trim() || os.homedir();
  if (!path.isAbsolute(directory))
    throw Error("Choose an absolute folder path.");
  const real = await fs.realpath(directory);
  const entries = await fs.readdir(real, { withFileTypes: true });
  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, path: path.join(real, entry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    path: real,
    parent: path.dirname(real),
    home: os.homedir(),
    folders,
  };
}

type Pending = {
  resolve: (value: { path: string | null }) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};
const pending = new Map<string, Pending>();
export function folderChooserOpen() {
  return pending.size > 0;
}
export function pickDesktopFolder(
  directory?: string,
): Promise<{ path: string | null }> {
  if (pending.size) throw Error("A folder chooser is already open.");
  const id = randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => {
        pending.delete(id);
        reject(Error("The folder chooser timed out. Please try again."));
      },
      10 * 60 * 1000,
    );
    pending.set(id, { resolve, reject, timer });
    process.stdout.write(
      "OMP_DESKTOP_FOLDER " +
        JSON.stringify({
          id,
          directory:
            directory && path.isAbsolute(directory) ? directory : undefined,
        }) +
        "\n",
    );
  });
}
export function receiveDesktopFolder(value: {
  id: string;
  path?: string | null;
  error?: string;
}) {
  const request = pending.get(value.id);
  if (!request) return;
  pending.delete(value.id);
  clearTimeout(request.timer);
  if (value.error) request.reject(Error(value.error));
  else if (value.path && !path.isAbsolute(value.path))
    request.reject(Error("The selected folder path is invalid."));
  else request.resolve({ path: value.path || null });
}
