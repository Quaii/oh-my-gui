// Source: user-supplied shadcn.io manual component.
"use client";

import { ChevronRightIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function Trace({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "gap-2 *:has-[>[data-slot=trace-line]]:rounded-md *:has-[>[data-slot=trace-line]]:focus-visible:ring-3 *:has-[>[data-slot=trace-line]]:focus-visible:ring-ring/50 flex w-full min-w-0 flex-col *:has-[>[data-slot=trace-line]]:flex *:has-[>[data-slot=trace-line]]:w-fit *:has-[>[data-slot=trace-line]]:min-w-0 *:has-[>[data-slot=trace-line]]:max-w-full *:has-[>[data-slot=trace-line]]:text-start *:has-[>[data-slot=trace-line]]:outline-none",
        className
      )}
      data-slot="trace"
      {...props}
    />
  );
}

function TraceLine({
  className,
  status,
  ...props
}: React.ComponentProps<"span"> & {
  /** The state of the work the line reports. */
  status?: "running" | "error" | "pending";
}) {
  return (
    <span
      className={cn(
        "gap-2 text-sm data-[status=running]:*:data-[slot=trace-title]:shimmer flex w-fit min-w-0 max-w-full in-[a,button]:cursor-pointer items-center in-[a:hover,button:hover]:text-foreground text-muted-foreground transition-colors data-[status=error]:in-[a:hover,button:hover]:text-destructive data-[status=error]:text-destructive data-[status=pending]:opacity-60",
        className
      )}
      data-slot="trace-line"
      data-status={status}
      {...props}
    />
  );
}

function TraceIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-4 [&_svg:not([class*='size-'])]:size-4 [[data-slot=trace-title]~&]:-ms-1 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none",
        className
      )}
      data-slot="trace-icon"
      {...props}
    />
  );
}

function TraceTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "cn-trace-title motion-reduce:shimmer-none min-w-0 truncate",
        className
      )}
      data-slot="trace-title"
      {...props}
    />
  );
}

function TraceDescription({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "cn-trace-description shrink-0 text-muted-foreground/70 tabular-nums",
        className
      )}
      data-slot="trace-description"
      {...props}
    />
  );
}

function TraceCollapsible({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Collapsible>, "open"> &
  (
    | { open?: undefined }
    | {
        open: boolean;
        onOpenChange: NonNullable<
          React.ComponentProps<typeof Collapsible>["onOpenChange"]
        >;
      }
  )) {
  return (
    <Collapsible
      className={cn(
        "cn-trace-collapsible flex w-full min-w-0 flex-col",
        className
      )}
      data-slot="trace-collapsible"
      {...props}
    />
  );
}

function TraceCollapsibleTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger>) {
  return (
    <CollapsibleTrigger
      className={cn(
        "gap-1 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 group/trace-collapsible-trigger flex w-fit min-w-0 max-w-full cursor-pointer items-center text-start text-muted-foreground outline-none transition-colors hover:text-foreground has-[[data-status=error]]:text-destructive",
        className
      )}
      data-slot="trace-collapsible-trigger"
      {...props}
    >
      {children}
      <TraceIcon className="transition-transform group-aria-expanded/trace-collapsible-trigger:rotate-90 motion-reduce:transition-none rtl:group-aria-expanded/trace-collapsible-trigger:-rotate-90">
        <ChevronRightIcon aria-hidden="true" className="rtl:-scale-x-100" />
      </TraceIcon>
    </CollapsibleTrigger>
  );
}

function TraceCollapsibleContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      className="duration-200 h-auto min-w-0 overflow-hidden transition-[height]"
      data-slot="trace-collapsible-content"
      {...props}
    >
      <div
        className={cn(
          "mt-2 mb-1 ms-[calc(--spacing(2)-1px)] border-s pe-1 ps-4 leading-relaxed wrap-break-word min-w-0 text-muted-foreground",
          className
        )}
        data-slot="trace-collapsible-content-inner"
      >
        {children}
      </div>
    </CollapsibleContent>
  );
}

export {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
};
