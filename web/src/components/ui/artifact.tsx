// Source: user-supplied shadcn.io artifact manual installation.
"use client";

import { type LucideIcon, XIcon } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * The panel for something the model made, apart from the chat: a document,
 * a file of code, a page. A bordered column: the header, then the content,
 * which scrolls on its own when the panel has a height.
 */
export const Artifact = (props: React.ComponentProps<"div">) => {
  const { className, ...rest } = props;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl border bg-background text-foreground shadow-xs",
        className
      )}
      data-slot="artifact"
      {...rest}
    />
  );
};

/** The top row: the title and description at the start, the actions at the end. */
export const ArtifactHeader = (props: React.ComponentProps<"div">) => {
  const { className, ...rest } = props;

  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-3 border-b bg-muted/50 px-4 py-3",
        className
      )}
      data-slot="artifact-header"
      {...rest}
    />
  );
};

/** What it is: the document's or the file's name. */
export const ArtifactTitle = (props: React.ComponentProps<"p">) => {
  const { className, ...rest } = props;

  return (
    <p
      className={cn("font-medium text-foreground text-sm", className)}
      data-slot="artifact-title"
      {...rest}
    />
  );
};

/** A line under the title: its kind, its size, when it changed. */
export const ArtifactDescription = (props: React.ComponentProps<"p">) => {
  const { className, ...rest } = props;

  return (
    <p
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="artifact-description"
      {...rest}
    />
  );
};

/** The row of actions at the header's end. */
export const ArtifactActions = (props: React.ComponentProps<"div">) => {
  const { className, ...rest } = props;

  return (
    <div
      className={cn("flex shrink-0 items-center gap-1", className)}
      data-slot="artifact-actions"
      {...rest}
    />
  );
};

export interface ArtifactActionProps extends React.ComponentProps<typeof Button> {
  /** The icon it shows, in place of children: a lucide icon component. */
  icon?: LucideIcon;
  /** Its accessible name, when it isn't the tooltip's text. */
  label?: string;
  /** Shown on hover and focus, and its accessible name without `label`. */
  tooltip?: string;
}

/**
 * An icon button in the header (copy, download, run), with a tooltip that
 * names it. Pass the icon as `icon`, or as children.
 */
export const ArtifactAction = (props: ArtifactActionProps) => {
  const {
    tooltip,
    label,
    icon: Icon,
    children,
    className,
    size = "icon-sm",
    variant = "ghost",
    ...rest
  } = props;

  const button = (
    <Button
      aria-label={label ?? tooltip}
      className={cn("text-muted-foreground hover:text-foreground", className)}
      data-slot="artifact-action"
      size={size}
      variant={variant}
      {...rest}
    >
      {/* biome-ignore lint/suspicious/noLeakedRender: without an icon, the children are the button's content, as they are. */}
      {Icon ? <Icon aria-hidden="true" /> : children}
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
 * The close button, an ×, for a panel that opens beside the chat. It's
 * named Close unless its children are text, which then name it.
 */
export const ArtifactClose = (props: React.ComponentProps<typeof Button>) => {
  const {
    children,
    className,
    size = "icon-sm",
    variant = "ghost",
    ...rest
  } = props;

  return (
    <Button
      aria-label={typeof children === "string" ? undefined : "Close"}
      className={cn("text-muted-foreground hover:text-foreground", className)}
      data-slot="artifact-close"
      size={size}
      variant={variant}
      {...rest}
    >
      {children ?? <XIcon aria-hidden="true" />}
    </Button>
  );
};

/** What was made. It scrolls when it's taller than the panel. */
export const ArtifactContent = (props: React.ComponentProps<"div">) => {
  const { className, ...rest } = props;

  return (
    <div
      className={cn("min-h-0 flex-1 overflow-auto p-4", className)}
      data-slot="artifact-content"
      {...rest}
    />
  );
};
