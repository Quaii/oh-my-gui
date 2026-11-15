// Source: user-supplied shadcn.io manual component.
"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type React from "react";
import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

interface MessageBranchContextValue {
  /** The version shown, kept inside the versions there are. */
  branch: number;
  goTo: (branch: number) => void;
  /** The versions' ids, in the order they sit in the page. */
  items: string[];
  register: (id: string) => void;
  unregister: (id: string) => void;
}

type ClickEvent = Parameters<NonNullable<ButtonProps["onClick"]>>[0];

const MessageBranchContext = createContext<MessageBranchContextValue | null>(
  null
);

const useMessageBranch = () => {
  const context = useContext(MessageBranchContext);

  if (!context) {
    throw new Error("MessageBranch parts must be used within MessageBranch");
  }

  return context;
};

/** Whether the element with id `a` comes before the one with id `b`. */
const before = (a: string, b: string) => {
  const one = document.getElementById(a);
  const two = document.getElementById(b);
  if (!(one && two)) {
    return 0;
  }
  // biome-ignore lint/suspicious/noBitwiseOperators: compareDocumentPosition answers in bits.
  return one.compareDocumentPosition(two) & Node.DOCUMENT_POSITION_FOLLOWING
    ? -1
    : 1;
};

export interface MessageBranchProps
  extends Omit<React.ComponentProps<"div">, "defaultValue"> {
  /** The version shown, from 0, when controlled. */
  branch?: number;
  /**
   * The version shown at first, from 0, when uncontrolled.
   *
   * @default 0
   */
  defaultBranch?: number;
  /** Called with the version's index, from 0, when the reader moves to it. */
  onBranchChange?: (branch: number) => void;
}

/**
 * Versions of one message, a regenerated reply or an edited prompt, shown
 * one at a time. Each version is a `MessageBranchItem` in
 * `MessageBranchContent`; the selector's buttons move between them, going
 * round from the last to the first.
 */
export const MessageBranch = (props: MessageBranchProps) => {
  const {
    branch: branchProp,
    defaultBranch = 0,
    onBranchChange,
    className,
    children,
    ...rest
  } = props;
  const [uncontrolled, setUncontrolled] = useState(defaultBranch);
  const [items, setItems] = useState<string[]>([]);
  const wanted = branchProp === undefined ? uncontrolled : branchProp;
  const branch = Math.min(Math.max(wanted, 0), Math.max(items.length - 1, 0));

  const goTo = (next: number) => {
    if (branchProp === undefined) {
      setUncontrolled(next);
    }
    onBranchChange?.(next);
  };

  const register = (id: string) => {
    setItems((current) =>
      [...current.filter((item) => item !== id), id].sort(before)
    );
  };

  const unregister = (id: string) => {
    setItems((current) => current.filter((item) => item !== id));
  };

  return (
    <MessageBranchContext.Provider
      value={{ branch, goTo, items, register, unregister }}
    >
      <div
        className={cn("flex w-full min-w-0 flex-col gap-2", className)}
        data-slot="message-branch"
        {...rest}
      >
        {children}
      </div>
    </MessageBranchContext.Provider>
  );
};

/**
 * Holds the versions and shows the current one. Before the versions have
 * registered (the server's HTML), the first in the page shows, however
 * deep the items sit.
 */
export const MessageBranchContent = (props: React.ComponentProps<"div">) => {
  const { className, ...rest } = props;
  const { items } = useMessageBranch();

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        // Until the versions register, CSS hides all but the first: any
        // element that is or holds an item, after a sibling that is or holds
        // one. Dropped once they register, so `:has()` costs nothing while a
        // reply streams.
        items.length === 0 &&
          "[&_:is([data-pending],:has([data-pending]))~:is([data-pending],:has([data-pending]))]:hidden",
        className
      )}
      data-slot="message-branch-content"
      {...rest}
    />
  );
};

/** One version: hidden, and kept, while another shows. */
export const MessageBranchItem = (props: React.ComponentProps<"div">) => {
  const { id: idProp, className, ...rest } = props;
  const autoId = useId();
  const id = idProp ?? autoId;
  const { branch, items, register, unregister } = useMessageBranch();
  const index = items.indexOf(id);
  const pending = index < 0;
  const active = index === branch;

  // Before paint, so a version chosen by `defaultBranch` shows from the
  // first frame in the browser.
  // biome-ignore lint/correctness/useExhaustiveDependencies: registers once per id; the context's functions are new each render.
  useLayoutEffect(() => {
    register(id);
    return () => unregister(id);
  }, [id]);

  return (
    <div
      className={cn("min-w-0", className)}
      data-pending={pending ? "" : undefined}
      data-slot="message-branch-item"
      data-state={active ? "active" : "inactive"}
      hidden={!(pending || active)}
      id={id}
      {...rest}
    />
  );
};

export interface MessageBranchSelectorProps
  extends React.ComponentProps<"div"> {
  /**
   * Whose message it is, as AI SDK Elements takes it: a user's selector
   * sits at the end.
   */
  from?: "assistant" | "system" | "user";
}

/**
 * The previous and next buttons and the page between them. It shows only
 * once there are two versions or more.
 */
export const MessageBranchSelector = (props: MessageBranchSelectorProps) => {
  const { from, className, ...rest } = props;
  const { items } = useMessageBranch();

  return items.length > 1 ? (
    // biome-ignore lint/a11y/useSemanticElements: a row of buttons, not a form's fieldset.
    <div
      aria-label="Versions"
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-0.5 text-muted-foreground data-[from=user]:ms-auto",
        className
      )}
      data-from={from}
      data-slot="message-branch-selector"
      role="group"
      {...rest}
    />
  ) : null;
};

/** Shows the version before, or the last from the first. */
export const MessageBranchPrevious = (props: ButtonProps) => {
  const { className, children, onClick, ...rest } = props;
  const { branch, goTo, items } = useMessageBranch();

  const click = (event: ClickEvent) => {
    onClick?.(event);
    goTo(branch > 0 ? branch - 1 : items.length - 1);
  };

  return (
    <Button
      aria-label="Previous version"
      className={cn("text-muted-foreground hover:text-foreground", className)}
      data-slot="message-branch-previous"
      disabled={items.length < 2}
      onClick={click}
      size="icon-xs"
      variant="ghost"
      {...rest}
    >
      {children ?? (
        <ChevronLeftIcon aria-hidden="true" className="rtl:rotate-180" />
      )}
    </Button>
  );
};

/** Shows the version after, or the first from the last. */
export const MessageBranchNext = (props: ButtonProps) => {
  const { className, children, onClick, ...rest } = props;
  const { branch, goTo, items } = useMessageBranch();

  const click = (event: ClickEvent) => {
    onClick?.(event);
    goTo(branch < items.length - 1 ? branch + 1 : 0);
  };

  return (
    <Button
      aria-label="Next version"
      className={cn("text-muted-foreground hover:text-foreground", className)}
      data-slot="message-branch-next"
      disabled={items.length < 2}
      onClick={click}
      size="icon-xs"
      variant="ghost"
      {...rest}
    >
      {children ?? (
        <ChevronRightIcon aria-hidden="true" className="rtl:rotate-180" />
      )}
    </Button>
  );
};

export interface MessageBranchPageProps extends React.ComponentProps<"span"> {
  /**
   * The text, from the version shown (counting from 1) and how many there
   * are. Return your own to translate it.
   *
   * @default (page, count) => `${page} of ${count}`
   */
  label?: (page: number, count: number) => React.ReactNode;
}

const pageOf = (page: number, count: number) => `${page} of ${count}`;

/** Where the reader is, "2 of 3", read out when it changes. */
export const MessageBranchPage = (props: MessageBranchPageProps) => {
  const { label = pageOf, className, ...rest } = props;
  const { branch, items } = useMessageBranch();

  return (
    <span
      aria-atomic="true"
      aria-live="polite"
      className={cn(
        "min-w-10 px-1 text-center font-medium text-muted-foreground text-xs tabular-nums [unicode-bidi:plaintext]",
        className
      )}
      data-slot="message-branch-page"
      {...rest}
    >
      {label(branch + 1, items.length)}
    </span>
  );
};
