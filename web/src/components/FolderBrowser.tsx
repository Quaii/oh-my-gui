import {LoadingIndicator as LoaderCircle} from './amicro/LoadingIndicator';
import { useEffect, useState } from "react";
import { get } from "../lib/api";
import { Button } from "./ui/button";
import { Folder, ArrowUp, House, } from "./NavigationIcons";

type FolderListing = {
  path: string;
  parent: string;
  home: string;
  folders: { name: string; path: string }[];
};
export function FolderBrowser({
  initial,
  onChoose,
  onCancel,
}: {
  initial: string;
  onChoose: (path: string) => void;
  onCancel: () => void;
}) {
  const [path, setPath] = useState(initial),
    [data, setData] = useState<FolderListing | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    get<FolderListing>("/api/project-folders?path=" + encodeURIComponent(path))
      .then((value) => {
        if (active) setData(value);
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path]);
  return (
    <section
      aria-label="Choose project folder"
      className="rounded-lg border bg-background/30 p-3"
    >
      <div className="mb-3 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={loading || !data || data.parent === data.path}
          aria-label="Parent folder"
          onClick={() => setPath(data!.parent)}
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Home folder"
          onClick={() => setPath("")}
        >
          <House className="size-4" />
        </Button>
        <span
          className="min-w-0 truncate text-xs text-muted-foreground"
          title={data?.path}
        >
          {loading ? "Loading folders…" : data?.path}
        </span>
      </div>
      {error && (
        <p role="alert" className="mb-3 text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="max-h-48 overflow-y-auto" aria-busy={loading}>
        {loading ? (
          <LoaderCircle className="m-3 size-4 animate-spin motion-reduce:animate-none" />
        ) : (
          !error &&
          data?.folders.map((folder) => (
            <button
              type="button"
              key={folder.path}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-sidebar-accent focus-visible:outline-ring"
              onClick={() => setPath(folder.path)}
            >
              <Folder className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{folder.name}</span>
            </button>
          ))
        )}
        {!loading && !error && !data?.folders.length && (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            No subfolders. You can select this folder.
          </p>
        )}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={loading || !!error || !data}
          onClick={() => data && onChoose(data.path)}
        >
          Select this folder
        </Button>
      </div>
    </section>
  );
}
