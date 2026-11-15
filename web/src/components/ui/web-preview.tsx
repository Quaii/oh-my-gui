// Source: user-supplied shadcn.io manual component.
"use client";

import { CircleXIcon, TriangleAlertIcon } from "lucide-react";
import type React from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleIndicator,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** One line of the console: AI SDK Elements' log shape. */
export interface WebPreviewLog {
  level: "log" | "warn" | "error";
  message: string;
  timestamp: Date;
}

interface WebPreviewContextValue {
  back: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  forward: () => void;
  reload: () => void;
  /** How many times the page was reloaded: the body loads it again on each. */
  reloads: number;
  setUrl: (url: string) => void;
  url: string;
}

type ClickEvent = Parameters<NonNullable<ButtonProps["onClick"]>>[0];
type KeyDownEvent = Parameters<
  NonNullable<React.ComponentProps<typeof Input>["onKeyDown"]>
>[0];

const WebPreviewContext = createContext<WebPreviewContextValue | null>(null);

const useWebPreview = () => {
  const context = useContext(WebPreviewContext);

  if (!context) {
    throw new Error("WebPreview parts must be used within WebPreview");
  }

  return context;
};

/** `hh:mm:ss` on a 24-hour clock, in every locale: a console's time. */
const formatTime = (date: Date) =>
  [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");

/** A scheme at the start (`https:`, `about:`, `data:`), not a host and its port (`localhost:3000`). */
const SCHEME = /^[a-z][a-z\d+.-]*:(?!\d)/i;

/** A dev server's host, which speaks `http`: localhost or an IP address, with any port. */
const LOCAL_HOST =
  /^(?:localhost|\d{1,3}(?:\.\d{1,3}){3}|\[[\da-f:.]+\])(?::\d+)?(?:[/?#]|$)/i;

/**
 * What Enter opens for a typed address: a whole address or a path as it
 * is, and a bare host (`example.com`, `localhost:3000`) with a scheme, as a
 * browser's address bar adds one. The frame would read a bare host as a
 * path on your own site.
 */
const addressOf = (typed: string) => {
  if (SCHEME.test(typed) || typed.startsWith("/")) {
    return typed;
  }
  return `${LOCAL_HOST.test(typed) ? "http" : "https"}://${typed}`;
};

export interface WebPreviewProps
  extends Omit<React.ComponentProps<"div">, "defaultValue"> {
  /** The address it opens at, when `url` isn't set. */
  defaultUrl?: string;
  /** Called with the new address when the reader navigates. */
  onUrlChange?: (url: string) => void;
  /** The address, controlled: set it with `onUrlChange`. */
  url?: string;
}

/**
 * A browser in the page: a toolbar, the page in a sandboxed frame, and its
 * console. It keeps the address and the history the toolbar walks, back
 * and forward; the address field navigates on Enter.
 */
export const WebPreview = (props: WebPreviewProps) => {
  const {
    className,
    children,
    defaultUrl = "",
    onUrlChange,
    url: urlProp,
    ...rest
  } = props;
  const [history, setHistory] = useState({
    entries: [urlProp ?? defaultUrl],
    index: 0,
  });
  const [reloads, setReloads] = useState(0);
  const url = urlProp ?? history.entries[history.index] ?? "";

  // An address set from outside is a visit too, so Back returns from it.
  useEffect(() => {
    if (urlProp === undefined) {
      return;
    }
    setHistory((current) =>
      current.entries[current.index] === urlProp
        ? current
        : {
            entries: [...current.entries.slice(0, current.index + 1), urlProp],
            index: current.index + 1,
          }
    );
  }, [urlProp]);

  const go = (entries: string[], index: number) => {
    setHistory({ entries, index });
    onUrlChange?.(entries[index] ?? "");
  };

  const setUrl = (next: string) => {
    // Entering the address that's open loads it again, as a browser does.
    if (next === url) {
      setReloads(reloads + 1);
      return;
    }
    const entries = [...history.entries.slice(0, history.index + 1), next];
    go(entries, entries.length - 1);
  };

  const back = () => {
    if (history.index > 0) {
      go(history.entries, history.index - 1);
    }
  };

  const forward = () => {
    if (history.index < history.entries.length - 1) {
      go(history.entries, history.index + 1);
    }
  };

  return (
    <WebPreviewContext.Provider
      value={{
        back,
        canGoBack: history.index > 0,
        canGoForward: history.index < history.entries.length - 1,
        forward,
        reload: () => setReloads(reloads + 1),
        reloads,
        setUrl,
        url,
      }}
    >
      <div
        className={cn(
          "flex size-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground",
          className
        )}
        data-slot="web-preview"
        {...rest}
      >
        {children}
      </div>
    </WebPreviewContext.Provider>
  );
};

/** The toolbar: the navigation buttons and the address field, in a row. */
export const WebPreviewNavigation = (props: React.ComponentProps<"div">) => {
  const { className, ...rest } = props;

  return (
    <div
      className={cn("flex min-w-0 items-center gap-1 border-b p-2", className)}
      data-slot="web-preview-navigation"
      {...rest}
    />
  );
};

export interface WebPreviewNavigationButtonProps extends ButtonProps {
  /**
   * What it does in the preview's history: `back`, `forward` (each disabled
   * at its end) or `reload`. Without it, it does what `onClick` says.
   */
  action?: "back" | "forward" | "reload";
  /** Shown on hover and focus, and its accessible name. */
  tooltip?: string;
}

/** An icon button in the toolbar, named by its tooltip. */
export const WebPreviewNavigationButton = (
  props: WebPreviewNavigationButtonProps
) => {
  const {
    action,
    children,
    className,
    disabled,
    onClick,
    size = "icon-sm",
    tooltip,
    variant = "ghost",
    ...rest
  } = props;
  const preview = useWebPreview();
  const spent =
    (action === "back" && !preview.canGoBack) ||
    (action === "forward" && !preview.canGoForward);

  const click = (event: ClickEvent) => {
    onClick?.(event);
    if (action === "back") {
      preview.back();
    } else if (action === "forward") {
      preview.forward();
    } else if (action === "reload") {
      preview.reload();
    }
  };

  const button = (
    <Button
      aria-label={tooltip}
      className={cn("text-muted-foreground hover:text-foreground", className)}
      data-slot="web-preview-navigation-button"
      disabled={disabled || spent}
      onClick={click}
      size={size}
      variant={variant}
      {...rest}
    >
      {children}
    </Button>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
};

/**
 * The address field. It shows the open address, and Enter opens what was
 * typed, with `https://` before a bare host (`http://` before localhost or
 * an IP address); Escape puts the open address back.
 */
export const WebPreviewUrl = (props: React.ComponentProps<typeof Input>) => {
  const { className, onKeyDown, value, ...rest } = props;
  const { setUrl, url } = useWebPreview();
  const [draft, setDraft] = useState(url);

  // The open address replaces what was typed when it changes: back, forward, a link.
  useEffect(() => {
    setDraft(url);
  }, [url]);

  // An `onChange` of yours replaces this one, with `value`: the field is yours.
  const change = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
  };

  const keyDown = (event: KeyDownEvent) => {
    onKeyDown?.(event);
    if (event.key === "Enter") {
      const typed = event.currentTarget.value.trim();
      // An empty field opens nothing, as in a browser's address bar.
      if (typed !== "") {
        const next = addressOf(typed);
        setDraft(next);
        setUrl(next);
      }
    } else if (event.key === "Escape") {
      setDraft(url);
    }
  };

  return (
    <Input
      aria-label="Address"
      className={cn("h-8 min-w-0 flex-1 text-sm", className)}
      data-slot="web-preview-url"
      // An address reads left to right in any language, as a browser's does.
      dir="ltr"
      onChange={change}
      onKeyDown={keyDown}
      placeholder="Enter URL…"
      value={value ?? draft}
      {...rest}
    />
  );
};

export interface WebPreviewBodyProps
  extends Omit<React.ComponentProps<"iframe">, "loading" | "src" | "srcDoc"> {
  /** Shown over the page while it's set: a spinner while the page is built. */
  loading?: React.ReactNode;
  /** The page's address, in place of the preview's. */
  src?: string;
  /** The page's HTML, in place of an address: what a model just wrote. */
  srcDoc?: string;
}

/**
 * The page, in a sandboxed `<iframe>`: `src`, else the preview's address,
 * or the HTML in `srcDoc`. Scripts, forms and popups run. A page at an
 * address keeps its own origin (its storage, its cookies); HTML from
 * `srcDoc` runs in an origin of its own, so the code a model wrote can't
 * reach your page. Pass `sandbox` to set the flags yourself.
 */
export const WebPreviewBody = (props: WebPreviewBodyProps) => {
  const { className, loading, src, srcDoc, title = "Preview", ...rest } = props;
  const { reloads, url } = useWebPreview();
  const frame = useRef<HTMLIFrameElement>(null);
  const address = (src ?? url) || "about:blank";

  // Set here, not as attributes, so a reload (the same address) loads it
  // again; and Solid's JSX has no `srcdoc`.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a reload changes `reloads` alone, and loads the page again.
  useEffect(() => {
    const node = frame.current;
    if (!node) {
      return;
    }
    if (srcDoc === undefined) {
      node.removeAttribute("srcdoc");
      node.src = address;
    } else {
      node.srcdoc = srcDoc;
    }
  }, [address, reloads, srcDoc]);

  return (
    <div
      className="relative min-h-0 flex-1 bg-background"
      data-slot="web-preview-body"
    >
      <iframe
        className={cn("size-full", className)}
        ref={frame}
        sandbox={
          srcDoc === undefined
            ? "allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
            : "allow-scripts allow-forms allow-popups allow-presentation"
        }
        title={title}
        {...rest}
      />
      {loading ? (
        <div
          className="absolute inset-0 flex items-center justify-center bg-background"
          data-slot="web-preview-loading"
        >
          {loading}
        </div>
      ) : null}
    </div>
  );
};

export interface WebPreviewConsoleProps
  extends React.ComponentProps<typeof Collapsible> {
  /** The lines to show, oldest first, each colored by its level. */
  logs?: WebPreviewLog[];
}

/**
 * The page's console, closed under the frame: a row that opens onto the
 * logs, warnings in the warning color and errors in the destructive one.
 */
export const WebPreviewConsole = (props: WebPreviewConsoleProps) => {
  const { children, className, logs = [], ...rest } = props;

  return (
    <Collapsible
      className={cn("border-t bg-muted/50 font-mono text-xs", className)}
      data-slot="web-preview-console"
      {...rest}
    >
      <CollapsibleTrigger
        className="flex w-full items-center gap-2 px-3 py-2 text-start font-medium font-sans text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
        data-slot="web-preview-console-trigger"
      >
        Console
        {logs.length > 0 ? (
          <span className="text-muted-foreground tabular-nums">
            {logs.length}
          </span>
        ) : null}
        <CollapsibleIndicator className="ms-auto text-muted-foreground [&_svg]:size-4" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          className="flex max-h-48 flex-col gap-1 overflow-y-auto px-3 pb-3"
          data-slot="web-preview-console-logs"
          role="log"
        >
          {logs.length === 0 ? (
            <p className="text-muted-foreground">No console output</p>
          ) : (
            logs.map((log, index) => (
              <div
                className={cn(
                  "flex min-w-0 items-start gap-2",
                  log.level === "error" && "text-destructive",
                  log.level === "warn" && "text-warning-foreground",
                  log.level === "log" && "text-foreground"
                )}
                data-level={log.level}
                // biome-ignore lint/suspicious/noArrayIndexKey: two lines may share a time and a message; a line is its place in the log.
                key={`${log.timestamp.getTime()}-${index}`}
              >
                <time
                  className="shrink-0 text-muted-foreground tabular-nums"
                  dateTime={log.timestamp.toISOString()}
                >
                  {formatTime(log.timestamp)}
                </time>
                {log.level === "warn" ? (
                  <TriangleAlertIcon
                    aria-hidden="true"
                    className="mt-0.5 size-3 shrink-0"
                  />
                ) : null}
                {log.level === "error" ? (
                  <CircleXIcon
                    aria-hidden="true"
                    className="mt-0.5 size-3 shrink-0"
                  />
                ) : null}
                <span className="min-w-0 break-words">
                  {log.level === "log" ? null : (
                    <span className="sr-only">
                      {log.level === "warn" ? "Warning: " : "Error: "}
                    </span>
                  )}
                  {log.message}
                </span>
              </div>
            ))
          )}
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
