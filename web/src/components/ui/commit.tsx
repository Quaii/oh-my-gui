// Source: user-supplied shadcn.io manual component.
"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  FileIcon,
  GitCommitHorizontalIcon,
  MinusIcon,
  PlusIcon,
} from "lucide-react";
import type * as React from "react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type CommitFileStatusValue = "added" | "modified" | "deleted" | "renamed";

const FILE_STATUS_CLASSES: Record<CommitFileStatusValue, string> = {
  added: "text-success-foreground",
  deleted: "text-destructive",
  modified: "text-warning-foreground",
  renamed: "text-info-foreground",
};

const FILE_STATUS_LETTERS: Record<CommitFileStatusValue, string> = {
  added: "A",
  deleted: "D",
  modified: "M",
  renamed: "R",
};

const FILE_STATUS_WORDS: Record<CommitFileStatusValue, string> = {
  added: "Added",
  deleted: "Deleted",
  modified: "Modified",
  renamed: "Renamed",
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/** The units a commit's age is told in, largest first. */
const TIME_UNITS: [number, Intl.RelativeTimeFormatUnit][] = [
  [YEAR, "year"],
  [MONTH, "month"],
  [WEEK, "week"],
  [DAY, "day"],
  [HOUR, "hour"],
  [MINUTE, "minute"],
  [SECOND, "second"],
];

/** A moment as seen from now, in the largest unit that fits: `3 hours ago`, `yesterday`. */
function relativeWords(time: number, now: number, locale: string) {
  const distance = time - now;
  const [size, unit] = TIME_UNITS.find(
    ([item]) => Math.abs(distance) >= item
  ) ?? [SECOND, "second"];
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    Math.round(distance / size),
    unit
  );
}

function Commit({
  className,
  ...props
}: React.ComponentProps<typeof Collapsible>) {
  return (
    <Collapsible
      className={cn(
        "flex w-full min-w-0 flex-col overflow-hidden rounded-lg border bg-background text-sm",
        className
      )}
      data-slot="commit"
      {...props}
    />
  );
}

function CommitHeader({
  className,
  children,
  collapsible = true,
  label = "Changed files",
  ...props
}: React.ComponentProps<"div"> & {
  /**
   * Whether the header opens and closes the card's `CommitContent`. Set it to
   * `false` on a card with no file list, so the header has no button and no
   * chevron that would open nothing.
   *
   * @default true
   */
  collapsible?: boolean;
  /** What the button that opens the file list is called by assistive tech. */
  label?: string;
}) {
  return (
    <div
      className={cn(
        "group/commit-header relative flex min-w-0 items-center gap-3 p-3 text-start transition-colors has-[>[data-slot=commit-trigger]:hover]:bg-muted/50 motion-reduce:transition-none",
        className
      )}
      data-slot="commit-header"
      {...props}
    >
      {collapsible ? (
        <CollapsibleTrigger
          aria-label={label}
          className="absolute inset-0 cursor-pointer outline-none focus-visible:inset-ring-2 focus-visible:inset-ring-ring/50"
          data-slot="commit-trigger"
        />
      ) : null}
      {children}
      {collapsible ? (
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none size-4 shrink-0 text-muted-foreground transition-transform group-has-[>[aria-expanded=true]]/commit-header:rotate-180 motion-reduce:transition-none"
        />
      ) : null}
    </div>
  );
}

function CommitHash({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 font-mono text-xs",
        className
      )}
      data-slot="commit-hash"
      {...props}
    >
      <GitCommitHorizontalIcon aria-hidden="true" className="size-3.5" />
      {children}
    </span>
  );
}

function CommitMessage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("min-w-0 truncate font-medium text-sm", className)}
      data-slot="commit-message"
      {...props}
    />
  );
}

function CommitMetadata({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs",
        className
      )}
      data-slot="commit-metadata"
      {...props}
    />
  );
}

function CommitSeparator({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn("text-muted-foreground/60", className)}
      data-slot="commit-separator"
      {...props}
    >
      {children ?? "•"}
    </span>
  );
}

function CommitInfo({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-w-0 flex-1 flex-col gap-1", className)}
      data-slot="commit-info"
      {...props}
    />
  );
}

function CommitAuthor({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-2", className)}
      data-slot="commit-author"
      {...props}
    />
  );
}

function CommitAuthorAvatar({
  initials,
  src,
  alt = "",
  className,
  ...props
}: React.ComponentProps<typeof Avatar> & {
  /** The letters shown until the picture loads, or without one. */
  initials: string;
  /** The author's picture. */
  src?: string;
  /** The picture's text alternative: empty when the author's name is beside it. */
  alt?: string;
}) {
  return (
    <Avatar
      className={cn("size-8", className)}
      data-slot="commit-author-avatar"
      {...props}
    >
      {src ? <AvatarImage alt={alt} src={src} /> : null}
      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
    </Avatar>
  );
}

function CommitTimestamp({
  date,
  locale = "en-US",
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"time">, "dateTime"> & {
  /** When the commit was made. */
  date: Date;
  /**
   * The locale the words are written in. Fixed by default, so the server
   * and the browser write the date the same way.
   *
   * @default "en-US"
   */
  locale?: string;
}) {
  // The time it was read at: none on the server, which shows the date itself.
  const [now, setNow] = useState<number | null>(null);
  const time = date.getTime();

  useEffect(() => {
    setNow(Date.now());
  }, []);

  return (
    <time
      className={cn("whitespace-nowrap text-xs", className)}
      data-slot="commit-timestamp"
      dateTime={date.toISOString()}
      dir="auto"
      title={
        now === null
          ? undefined
          : new Intl.DateTimeFormat(locale, {
              dateStyle: "full",
              timeStyle: "short",
            }).format(time)
      }
      {...props}
    >
      {children ??
        (now === null
          ? new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeZone: "UTC",
            }).format(time)
          : relativeWords(time, now, locale))}
    </time>
  );
}

function CommitActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative z-10 flex shrink-0 items-center gap-1",
        className
      )}
      data-slot="commit-actions"
      {...props}
    />
  );
}

function CommitCopyButton({
  hash,
  onCopy,
  onError,
  timeout = 2000,
  variant = "ghost",
  size = "icon-sm",
  className,
  children,
  onClick,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onCopy" | "onError"> & {
  /** The full hash it copies. */
  hash: string;
  /** Called once the hash is on the clipboard. */
  onCopy?: () => void;
  /** Called when the browser refuses the clipboard. */
  onError?: (error: Error) => void;
  /**
   * How long the check shows after a copy, in milliseconds.
   *
   * @default 2000
   */
  timeout?: number;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), timeout);
    return () => clearTimeout(timer);
  }, [copied, timeout]);

  return (
    <>
      <Button
        aria-label={copied ? "Copied" : "Copy commit hash"}
        className={cn("text-muted-foreground", className)}
        data-copied={copied || undefined}
        data-slot="commit-copy-button"
        onClick={(event) => {
          onClick?.(event);
          if (typeof navigator === "undefined" || !navigator.clipboard) {
            onError?.(new Error("The Clipboard API isn't available."));
            return;
          }
          navigator.clipboard
            .writeText(hash)
            .then(() => {
              setCopied(true);
              onCopy?.();
            })
            .catch((error: unknown) => {
              onError?.(
                error instanceof Error ? error : new Error(String(error))
              );
            });
        }}
        size={size}
        variant={variant}
        {...props}
      >
        {children ??
          (copied ? (
            <CheckIcon aria-hidden="true" />
          ) : (
            <CopyIcon aria-hidden="true" />
          ))}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </>
  );
}

function CommitContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent data-slot="commit-content" {...props}>
      <div
        className={cn("border-t p-2", className)}
        data-slot="commit-content-inner"
      >
        {children}
      </div>
    </CollapsibleContent>
  );
}

function CommitFiles({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("flex min-w-0 flex-col gap-0.5", className)}
      data-slot="commit-files"
      {...props}
    />
  );
}

function CommitFile({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      className={cn(
        "flex min-w-0 items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50",
        className
      )}
      data-slot="commit-file"
      {...props}
    />
  );
}

function CommitFileInfo({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-w-0 items-center gap-2", className)}
      data-slot="commit-file-info"
      {...props}
    />
  );
}

function CommitFileStatus({
  status,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & {
  /** What the commit did to the file: its letter and color. */
  status: CommitFileStatusValue;
}) {
  return (
    <span
      className={cn(
        "w-3 shrink-0 text-center font-medium font-mono text-xs",
        FILE_STATUS_CLASSES[status],
        className
      )}
      data-slot="commit-file-status"
      data-status={status}
      {...props}
    >
      {children ?? (
        <>
          <span aria-hidden="true">{FILE_STATUS_LETTERS[status]}</span>
          <span className="sr-only">{FILE_STATUS_WORDS[status]}</span>
        </>
      )}
    </span>
  );
}

function CommitFileIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <FileIcon
      aria-hidden="true"
      className={cn("size-3.5 shrink-0 text-muted-foreground", className)}
      data-slot="commit-file-icon"
      {...props}
    />
  );
}

function CommitFilePath({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("min-w-0 truncate font-mono text-xs", className)}
      data-slot="commit-file-path"
      dir="ltr"
      {...props}
    />
  );
}

function CommitFileChanges({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 font-mono text-xs tabular-nums",
        className
      )}
      data-slot="commit-file-changes"
      {...props}
    />
  );
}

function CommitFileAdditions({
  count,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & {
  /** Lines added. Nothing renders at 0. */
  count: number;
}) {
  if (count <= 0) {
    return null;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center text-success-foreground",
        className
      )}
      data-slot="commit-file-additions"
      dir="ltr"
      {...props}
    >
      {children ?? (
        <>
          <PlusIcon aria-hidden="true" className="size-3" />
          {count}
          <span className="sr-only"> lines added</span>
        </>
      )}
    </span>
  );
}

function CommitFileDeletions({
  count,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & {
  /** Lines removed. Nothing renders at 0. */
  count: number;
}) {
  if (count <= 0) {
    return null;
  }
  return (
    <span
      className={cn("inline-flex items-center text-destructive", className)}
      data-slot="commit-file-deletions"
      dir="ltr"
      {...props}
    >
      {children ?? (
        <>
          <MinusIcon aria-hidden="true" className="size-3" />
          {count}
          <span className="sr-only"> lines removed</span>
        </>
      )}
    </span>
  );
}

export {
  Commit,
  CommitActions,
  CommitAuthor,
  CommitAuthorAvatar,
  CommitContent,
  CommitCopyButton,
  CommitFile,
  CommitFileAdditions,
  CommitFileChanges,
  CommitFileDeletions,
  CommitFileIcon,
  CommitFileInfo,
  CommitFilePath,
  CommitFileStatus,
  CommitFiles,
  CommitHash,
  CommitHeader,
  CommitInfo,
  CommitMessage,
  CommitMetadata,
  CommitSeparator,
  CommitTimestamp,
};
